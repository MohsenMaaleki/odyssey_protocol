// server/services/mission.ts
// Mission Core MVP business logic
// Devvit docs refs:
// - Post Data (authoritative per-post state): https://developers.reddit.com/docs/interactive_posts/post-data
// - Realtime: https://developers.reddit.com/docs/realtime/
// - Scheduled Actions: https://developers.reddit.com/docs/scheduled-actions/
// - Storage (global SP, unlocks): https://developers.reddit.com/docs/storage/

import type {
  MissionPostData,
  MissionPhase,
  PayloadKind,
  EngineKind,
  MissionType,
  FuelTankSize,
} from '../../shared/types/mission';
import { RealtimeService } from './realtime';
import { UnlockService } from './unlock';
import { LeaderboardService } from './leaderboard';
import { GalleryService } from './gallery';
import {
  nowIso,
  clamp100,
  uniquePush,
  generateMissionId,
} from '../utils/missionHelpers';

export interface PostDataAdapter {
  read: () => Promise<MissionPostData>;
  write: (mut: (p: MissionPostData) => MissionPostData) => Promise<MissionPostData>;
  replace: (next: MissionPostData) => Promise<MissionPostData>;
}

export interface ScheduleAdapter {
  scheduleLaunchAt: (missionId: string, atIso: string) => Promise<void>;
  cancelLaunch: (missionId: string) => Promise<void>;
  scheduleVoteCloseAt?: (missionId: string, atIso: string) => Promise<void>;
}

export class MissionService {
  constructor(
    private readonly postData: PostDataAdapter,
    private readonly realtime: RealtimeService,
    private readonly unlocks: UnlockService,
    private readonly leaderboard: LeaderboardService,
    private readonly gallery: GalleryService,
    private readonly schedule: ScheduleAdapter
  ) {}

  async startMission(username: string, { usePromoted }: { usePromoted?: boolean } = {}) {
    const mission_id = generateMissionId();
    const started_at = nowIso();

    const base: MissionPostData = {
      mission_id,
      phase: 'DESIGN',
      fuel: 40,
      hull: 100,
      crew: 100,
      success: 35,
      payload: null,
      engine: null,
      participants: [],
      decisive_actions: [],
      started_at,
      phase_started_at: started_at,
      launch_countdown_until: null,
      science_points_delta: 0,
      outcome: null,
      promoted_title: null,
      promoted_payload_hint: null,
    };

    // Optionally seed from promoted ballot winner
    if (usePromoted) {
      // TODO: read promoted mission from ballots service
      // const winner = await this.readPromotedWinner();
      // if (winner) {
      //   base.promoted_title = winner.title;
      //   base.promoted_payload_hint = mapPayload(winner.payload_hint);
      //   base.payload = base.promoted_payload_hint ?? null;
      // }
    }

    // Apply unlock baseline effects (read-time application model)
    const effects = await this.unlocks.computeBaselineEffects();
    base.success = clamp100(base.success + (effects.successChance ?? 0));
    base.crew = clamp100(base.crew + (effects.morale ?? 0));

    const next = await this.postData.replace(base);
    await this.publishHudSnapshot(next);

    console.log(`[Mission] Started mission ${mission_id} for user ${username}`);
    return next;
  }

  async applyDesign(
    username: string,
    mut: {
      setPayload?: Exclude<PayloadKind, null>;
      addFuel?: number;
      pickEngine?: EngineKind;
    }
  ) {
    return this.postData
      .write((p) => {
        this.assertPhase(p, 'DESIGN');
        uniquePush(p.participants, username);

        if (mut.setPayload) {
          p.payload = mut.setPayload;
          // Payload affects stats slightly
          if (mut.setPayload === 'Probe') {
            p.success = clamp100(p.success + 2);
          } else if (mut.setPayload === 'Hab') {
            p.crew = clamp100(p.crew + 5);
          } else if (mut.setPayload === 'Cargo') {
            p.fuel = clamp100(p.fuel + 5);
          }
        }

        if (mut.addFuel) {
          p.fuel = clamp100(p.fuel + mut.addFuel);
          p.hull = clamp100(p.hull - 2); // heavier load risk
        }

        if (mut.pickEngine === 'Light') {
          p.engine = 'Light';
          p.success = clamp100(p.success + 5);
        } else if (mut.pickEngine === 'Heavy') {
          p.engine = 'Heavy';
          p.success = clamp100(p.success + 10);
          p.crew = clamp100(p.crew - 2);
        }

        return p;
      })
      .then(async (next) => {
        await this.publishHudSnapshot(next);
        console.log(`[Mission] Design action by ${username}: ${JSON.stringify(mut)}`);
        return next;
      });
  }

  async finalizeDesign(username: string) {
    return this.postData
      .write((p) => {
        this.assertPhase(p, 'DESIGN');

        // First decisive wins
        p.phase = 'LAUNCH';
        p.phase_started_at = nowIso();
        uniquePush(p.decisive_actions, username);

        // T-120 launch countdown
        const t = Date.now() + 120_000;
        p.launch_countdown_until = new Date(t).toISOString();

        return p;
      })
      .then(async (next) => {
        // Schedule auto-launch
        if (next.mission_id && next.launch_countdown_until) {
          await this.schedule.scheduleLaunchAt(
            next.mission_id,
            next.launch_countdown_until
          );
        }

        await this.realtime.startCountdown(
          next.mission_id!,
          'LAUNCH',
          120_000,
          `launch-${next.mission_id}`
        );
        await this.publishHudSnapshot(next);

        console.log(
          `[Mission] Design finalized by ${username}, launch countdown started`
        );
        return next;
      });
  }

  async launch(resolveByScheduler = false) {
    return this.postData
      .write((p) => {
        this.assertPhase(p, 'LAUNCH');

        // Clear countdown
        p.launch_countdown_until = null;

        // Simple resolution: RNG + success indicator
        const roll = Math.random() * 100;
        console.log(
          `[Mission] Launch roll: ${roll.toFixed(1)} vs success ${p.success}`
        );

        if (roll <= p.success) {
          p.phase = 'FLIGHT';
          p.phase_started_at = nowIso();
          p.fuel = clamp100(p.fuel - 10);
          p.outcome = null;
          console.log(`[Mission] Launch SUCCESS`);
        } else {
          p.phase = 'RESULT';
          p.phase_started_at = nowIso();
          p.outcome = 'fail';
          p.science_points_delta = 2;
          console.log(`[Mission] Launch FAILED`);
        }

        return p;
      })
      .then(async (next) => {
        await this.realtime.endCountdown(next.mission_id!, 'LAUNCH');
        await this.publishHudSnapshot(next);
        return next;
      });
  }

  async flightAction(
    username: string,
    action: 'HoldCourse' | 'CourseCorrection' | 'RunExperiment'
  ) {
    return this.postData
      .write((p) => {
        this.assertPhase(p, 'FLIGHT');
        uniquePush(p.participants, username);
        uniquePush(p.decisive_actions, username);

        switch (action) {
          case 'CourseCorrection':
            p.fuel = clamp100(p.fuel - 8);
            p.success = clamp100(p.success + 6);
            console.log(`[Mission] Course correction by ${username}`);
            break;
          case 'RunExperiment':
            p.fuel = clamp100(p.fuel - 4);
            p.science_points_delta = (p.science_points_delta ?? 0) + 3;
            console.log(`[Mission] Experiment run by ${username}`);
            break;
          case 'HoldCourse':
          default:
            console.log(`[Mission] Holding course by ${username}`);
            break;
        }

        // Resolve mission immediately for MVP
        if (p.fuel <= 0 || p.hull <= 0) {
          p.outcome = 'abort';
          p.science_points_delta = (p.science_points_delta ?? 0) + 1;
          console.log(`[Mission] Mission ABORTED`);
        } else {
          p.outcome = 'success';
          p.science_points_delta = (p.science_points_delta ?? 0) + 10;
          console.log(`[Mission] Mission SUCCESS`);
        }

        p.phase = 'RESULT';
        p.phase_started_at = nowIso();

        return p;
      })
      .then(async (next) => {
        await this.publishHudSnapshot(next);
        return next;
      });
  }

  async acknowledge(username: string) {
    // Award SP & leaderboard points; expose gallery CTA on the client
    const p = await this.postData.read();
    this.assertPhase(p, 'RESULT');

    const delta = p.science_points_delta ?? 0;
    if (delta > 0) {
      await this.unlocks.addSciencePointsGlobal(delta);
      console.log(`[Mission] Awarded ${delta} science points globally`);
    }

    // Leaderboard points (idempotent logic should live inside service)
    if (p.decisive_actions.length > 0) {
      await this.leaderboard.creditDecisive(p.mission_id!, p.decisive_actions);
    }

    const reason =
      p.outcome === 'success'
        ? 'MISSION_SUCCESS'
        : p.outcome === 'fail'
          ? 'MISSION_FAIL'
          : 'MISSION_ABORT';

    if (p.participants.length > 0) {
      await this.leaderboard.bulkCreditParticipants(
        p.mission_id!,
        p.participants,
        reason
      );
    }

    console.log(
      `[Mission] Acknowledged by ${username}, rewards distributed`
    );

    // No state reset here: client may call /mission/start next
    return p;
  }

  async reset() {
    // Dev convenience: reset to IDLE
    const idle: MissionPostData = {
      mission_id: null,
      phase: 'IDLE',
      fuel: 0,
      hull: 100,
      crew: 100,
      success: 0,
      payload: null,
      engine: null,
      participants: [],
      decisive_actions: [],
      started_at: null,
      phase_started_at: null,
      launch_countdown_until: null,
      science_points_delta: 0,
      outcome: null,
      promoted_title: null,
      promoted_payload_hint: null,
    };

    const next = await this.postData.replace(idle);
    console.log(`[Mission] Reset to IDLE`);
    return next;
  }

  // --- helpers ---
  private assertPhase(p: MissionPostData, expected: MissionPhase) {
    if (p.phase !== expected) {
      const msg = `Phase mismatch. Expected=${expected}, actual=${p.phase}`;
      throw new Error(msg);
    }
  }

  private async publishHudSnapshot(p: MissionPostData) {
    if (!p.mission_id) return;

    await this.realtime.publishHudUpdate(
      p.mission_id,
      {
        fuel: p.fuel,
        hull: p.hull,
        crew: p.crew,
        success: p.success,
        scienceDelta: p.science_points_delta ?? 0,
        phase: p.phase,
      },
      true // full snapshot
    );
  }

  // ==================== Phase 2: Voting Methods ====================

  /**
   * Open a timed vote window and publish timer start (Realtime)
   */
  async openVote(
    username: string,
    phase: import('../../shared/types/mission').VotePhase,
    options: import('../../shared/types/mission').VoteOptionId[],
    durationSec: number
  ) {
    return this.postData
      .write((p) => {
        // Only one window at a time; ensure matching phase/state
        if (p.vote_window && p.vote_window.status === 'open') {
          throw new Error('A vote is already open.');
        }
        if (p.phase !== phase) {
          throw new Error(
            `Phase mismatch for opening vote. Current=${p.phase}, requested=${phase}`
          );
        }

        const id = `vote:${p.mission_id}:${Date.now()}`;
        const opened_at = nowIso();
        const ends_at = new Date(
          Date.now() + Math.max(5, durationSec) * 1000
        ).toISOString();

        p.vote_window = {
          id,
          phase,
          options,
          opened_at,
          ends_at,
          status: 'open',
          ballots: {},
          option_first_vote_at: {},
        };

        uniquePush(p.participants, username);
        return p;
      })
      .then(async (next) => {
        // Publish timer start via Realtime
        await this.realtime.startCountdown(
          next.mission_id!,
          'PHASE',
          durationSec * 1000,
          `vote-${next.vote_window!.id}`
        );
        await this.publishHudSnapshot(next);

        console.log(
          `[Mission] Vote opened by ${username}: phase=${phase}, options=${options.join(',')}, duration=${durationSec}s`
        );
        return next;
      });
  }

  /**
   * Cast or change a vote idempotently while window is open
   */
  async castVote(
    username: string,
    optionId: import('../../shared/types/mission').VoteOptionId
  ) {
    return this.postData
      .write((p) => {
        const w = p.vote_window;
        if (!w || w.status !== 'open') throw new Error('No open vote.');
        if (!w.options.includes(optionId)) throw new Error('Invalid option.');

        // Record or update user's vote
        const firstTimeForOption = !Object.values(w.ballots).includes(optionId);
        w.ballots[username] = optionId;

        if (firstTimeForOption && !w.option_first_vote_at[optionId]) {
          w.option_first_vote_at[optionId] = nowIso();
        }

        uniquePush(p.participants, username);
        return p;
      })
      .then(async (next) => {
        // Publish lightweight tally update (Realtime)
        const { tallyVotes } = await import('./voting');
        const tallies = tallyVotes(next.vote_window!);

        console.log(
          `[Mission] Vote cast by ${username}: option=${optionId}, tallies=${JSON.stringify(tallies.perOption)}`
        );

        return { post: next, tallies };
      });
  }

  /**
   * Close vote (scheduler/mod). Applies winning action and credits decisives.
   */
  async closeVote(requestedByScheduler = false) {
    return this.postData
      .write((p) => {
        const w = p.vote_window;
        if (!w || w.status !== 'open') return p; // idempotent

        // Hard-close window
        w.status = 'closed';
        w.ends_at = nowIso();
        return p;
      })
      .then(async (next) => {
        const w = next.vote_window!;
        const { tallyVotes, getVotersForOption } = await import('./voting');
        const tallies = tallyVotes(w);
        const winner = tallies.winner;

        // Publish timer end
        await this.realtime.endCountdown(next.mission_id!, 'PHASE');

        console.log(
          `[Mission] Vote closed: winner=${winner}, tallies=${JSON.stringify(tallies.perOption)}`
        );

        // Apply winning action to mission state
        if (winner) {
          await this.applyWinningOption(w.phase, winner, next);
        }

        // Credit decisive points to *all voters who chose the winning option*
        if (winner) {
          const winningVoters = getVotersForOption(w, winner);
          if (winningVoters.length) {
            await this.leaderboard.creditDecisive(
              next.mission_id!,
              winningVoters
            );
            console.log(
              `[Mission] Credited ${winningVoters.length} decisive voters for option ${winner}`
            );
          }
        }

        // Update HUD snapshot after applying winner
        const updated = await this.postData.read();
        await this.publishHudSnapshot(updated);

        return { post: updated, tallies };
      });
  }

  /**
   * Apply a phase-specific winning option to mission state
   */
  private async applyWinningOption(
    phase: import('../../shared/types/mission').VotePhase,
    winner: import('../../shared/types/mission').VoteOptionId,
    cur: MissionPostData
  ) {
    // Re-read and write to ensure we're applying to latest mission state
    await this.postData.write((p) => {
      if (p.phase !== phase && phase !== 'LAUNCH') {
        // If phase moved (e.g., due to auto progression), do nothing (idempotent)
        return p;
      }

      switch (phase) {
        case 'DESIGN':
          // For MVP, treat any DESIGN vote winner as "finalize design"
          p.phase = 'LAUNCH';
          p.phase_started_at = nowIso();
          console.log(`[Mission] Design finalized via vote winner: ${winner}`);
          break;

        case 'LAUNCH':
          // Winner "manual_launch" -> resolve launch immediately
          const roll = Math.random() * 100;
          p.launch_countdown_until = null;

          if (roll <= p.success) {
            p.phase = 'FLIGHT';
            p.phase_started_at = nowIso();
            p.fuel = clamp100(p.fuel - 10);
            p.outcome = null;
            console.log(`[Mission] Launch SUCCESS via vote (roll=${roll.toFixed(1)})`);
          } else {
            p.phase = 'RESULT';
            p.phase_started_at = nowIso();
            p.outcome = 'fail';
            p.science_points_delta = (p.science_points_delta ?? 0) + 2;
            console.log(`[Mission] Launch FAILED via vote (roll=${roll.toFixed(1)})`);
          }
          break;

        case 'FLIGHT':
          if (winner === 'course_correction') {
            p.fuel = clamp100(p.fuel - 8);
            p.success = clamp100(p.success + 6);
            console.log(`[Mission] Course correction applied via vote`);
          } else if (winner === 'run_experiment') {
            p.fuel = clamp100(p.fuel - 4);
            p.science_points_delta = (p.science_points_delta ?? 0) + 3;
            console.log(`[Mission] Experiment run via vote`);
          } else {
            // hold_course: no stat change
            console.log(`[Mission] Holding course via vote`);
          }

          // End mission for MVP
          if (p.fuel <= 0 || p.hull <= 0) {
            p.outcome = 'abort';
            p.science_points_delta = (p.science_points_delta ?? 0) + 1;
            console.log(`[Mission] Mission ABORTED`);
          } else {
            p.outcome = 'success';
            p.science_points_delta = (p.science_points_delta ?? 0) + 10;
            console.log(`[Mission] Mission SUCCESS`);
          }

          p.phase = 'RESULT';
          p.phase_started_at = nowIso();
          break;
      }

      return p;
    });
  }
}
