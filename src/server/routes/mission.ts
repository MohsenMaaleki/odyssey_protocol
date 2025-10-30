// server/routes/mission.ts
// Mission Core MVP API endpoints
// Wire these into server/index.ts with app.use("/api/mission", missionRouter)
// Doc refs:
// - Realtime (pub/sub from handlers): https://developers.reddit.com/docs/realtime/
// - Scheduled Actions (auto-launch): https://developers.reddit.com/docs/scheduled-actions/
// - Storage/PostData alignment: https://developers.reddit.com/docs/interactive_posts/post-data

import { Router } from 'express';
import type { Request, Response } from 'express';
import type {
  ApiResp,
  StartMissionRequest,
  DesignActionRequest,
  FlightActionRequest,
  MissionSnapshotResponse,
} from '../../shared/types/mission';
import { MissionService } from '../services/mission';
import { buildMissionAdapters } from '../utils/missionInit';
import { reddit } from '@devvit/web/server';

export const missionRouter = Router();

// Build a per-request service with adapters (PostData/Realtime/Scheduler)
function svc(req: Request) {
  const { postData, realtime, unlocks, leaderboard, gallery, schedule } =
    buildMissionAdapters(req);
  return new MissionService(
    postData,
    realtime,
    unlocks,
    leaderboard,
    gallery,
    schedule
  );
}

// Extract current Reddit username from auth
async function currentUser(_req: Request): Promise<string> {
  try {
    const username = await reddit.getCurrentUsername();
    return username ?? 'u_anonymous';
  } catch {
    return 'u_anonymous';
  }
}

/**
 * POST /api/mission/start
 * Start a new mission
 */
missionRouter.post(
  '/start',
  async (req: Request, res: Response<ApiResp<MissionSnapshotResponse>>) => {
    try {
      const s = svc(req);
      const body = (req.body ?? {}) as StartMissionRequest;
      const username = await currentUser(req);
      const p = await s.startMission(username, body);

      const out: MissionSnapshotResponse = {
        mission_id: p.mission_id,
        phase: p.phase,
        fuel: p.fuel,
        hull: p.hull,
        crew: p.crew,
        success: p.success,
        payload: p.payload,
        engine: p.engine,
        science_points_delta: p.science_points_delta,
        outcome: p.outcome,
        timers: {
          launch_countdown_until: p.launch_countdown_until,
          vote_window_until: p.vote_window?.ends_at ?? null,
        },
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Start error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * POST /api/mission/design
 * Apply design choices (payload, fuel, engine)
 */
missionRouter.post(
  '/design',
  async (req: Request, res: Response<ApiResp<MissionSnapshotResponse>>) => {
    try {
      const s = svc(req);
      const body = (req.body ?? {}) as DesignActionRequest;
      const username = await currentUser(req);
      const p = await s.applyDesign(username, body);

      const out: MissionSnapshotResponse = {
        mission_id: p.mission_id,
        phase: p.phase,
        fuel: p.fuel,
        hull: p.hull,
        crew: p.crew,
        success: p.success,
        payload: p.payload,
        engine: p.engine,
        science_points_delta: p.science_points_delta,
        outcome: p.outcome,
        timers: {
          launch_countdown_until: p.launch_countdown_until,
          vote_window_until: p.vote_window?.ends_at ?? null,
        },
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Design error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * POST /api/mission/finalize-design
 * Finalize design and start launch countdown (T-120s)
 */
missionRouter.post(
  '/finalize-design',
  async (req: Request, res: Response<ApiResp<MissionSnapshotResponse>>) => {
    try {
      const s = svc(req);
      const username = await currentUser(req);
      const p = await s.finalizeDesign(username);

      const out: MissionSnapshotResponse = {
        mission_id: p.mission_id,
        phase: p.phase,
        fuel: p.fuel,
        hull: p.hull,
        crew: p.crew,
        success: p.success,
        payload: p.payload,
        engine: p.engine,
        science_points_delta: p.science_points_delta,
        outcome: p.outcome,
        timers: {
          launch_countdown_until: p.launch_countdown_until,
          vote_window_until: p.vote_window?.ends_at ?? null,
        },
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Finalize design error:', e);
      res.status(409).json({ ok: false, error: e.message });
    }
  }
);

/**
 * POST /api/mission/launch
 * Manual launch or auto-launch (called by scheduler at T-0)
 */
missionRouter.post(
  '/launch',
  async (req: Request, res: Response<ApiResp<MissionSnapshotResponse>>) => {
    try {
      const s = svc(req);
      const p = await s.launch(false);

      const out: MissionSnapshotResponse = {
        mission_id: p.mission_id,
        phase: p.phase,
        fuel: p.fuel,
        hull: p.hull,
        crew: p.crew,
        success: p.success,
        payload: p.payload,
        engine: p.engine,
        science_points_delta: p.science_points_delta,
        outcome: p.outcome,
        timers: {
          launch_countdown_until: p.launch_countdown_until,
          vote_window_until: p.vote_window?.ends_at ?? null,
        },
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Launch error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * POST /api/mission/flight-action
 * Execute flight action (HoldCourse, CourseCorrection, RunExperiment)
 */
missionRouter.post(
  '/flight-action',
  async (req: Request, res: Response<ApiResp<MissionSnapshotResponse>>) => {
    try {
      const s = svc(req);
      const body = (req.body ?? {}) as FlightActionRequest;
      const username = await currentUser(req);
      const p = await s.flightAction(username, body.action);

      const out: MissionSnapshotResponse = {
        mission_id: p.mission_id,
        phase: p.phase,
        fuel: p.fuel,
        hull: p.hull,
        crew: p.crew,
        success: p.success,
        payload: p.payload,
        engine: p.engine,
        science_points_delta: p.science_points_delta,
        outcome: p.outcome,
        timers: {
          launch_countdown_until: p.launch_countdown_until,
          vote_window_until: p.vote_window?.ends_at ?? null,
        },
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Flight action error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * POST /api/mission/acknowledge
 * Acknowledge results and distribute rewards
 */
missionRouter.post(
  '/acknowledge',
  async (req: Request, res: Response<ApiResp<MissionSnapshotResponse>>) => {
    try {
      const s = svc(req);
      const username = await currentUser(req);
      const p = await s.acknowledge(username);

      const out: MissionSnapshotResponse = {
        mission_id: p.mission_id,
        phase: p.phase,
        fuel: p.fuel,
        hull: p.hull,
        crew: p.crew,
        success: p.success,
        payload: p.payload,
        engine: p.engine,
        science_points_delta: p.science_points_delta,
        outcome: p.outcome,
        timers: {
          launch_countdown_until: p.launch_countdown_until,
          vote_window_until: p.vote_window?.ends_at ?? null,
        },
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Acknowledge error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * POST /api/mission/reset
 * Dev convenience: reset mission to IDLE
 */
missionRouter.post(
  '/reset',
  async (req: Request, res: Response<ApiResp<{}>>) => {
    try {
      const s = svc(req);
      await s.reset();
      res.json({ ok: true, data: {} });
    } catch (e: any) {
      console.error('[Mission API] Reset error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * GET /api/mission/snapshot
 * Get current mission state snapshot
 */
missionRouter.get(
  '/snapshot',
  async (req: Request, res: Response<ApiResp<MissionSnapshotResponse>>) => {
    try {
      const { postData } = buildMissionAdapters(req);
      const p = await postData.read();

      const out: MissionSnapshotResponse = {
        mission_id: p.mission_id,
        phase: p.phase,
        fuel: p.fuel,
        hull: p.hull,
        crew: p.crew,
        success: p.success,
        payload: p.payload,
        engine: p.engine,
        science_points_delta: p.science_points_delta,
        outcome: p.outcome,
        timers: {
          launch_countdown_until: p.launch_countdown_until,
          vote_window_until: p.vote_window?.ends_at ?? null,
        },
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Snapshot error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

export default missionRouter;

// ==================== Phase 2: Voting Endpoints ====================

/**
 * POST /api/mission/open-vote
 * Open a timed vote window for a phase
 */
missionRouter.post(
  '/open-vote',
  async (
    req: Request,
    res: Response<ApiResp<import('../../shared/types/mission').VoteStateResponse>>
  ) => {
    try {
      const s = svc(req);
      const user = await currentUser(req);
      const body = (req.body ?? {}) as import('../../shared/types/mission').VoteOpenRequest;

      const p = await s.openVote(user, body.phase, body.options, body.durationSec);

      const { tallyVotes } = await import('../services/voting');
      const tallies = p.vote_window
        ? tallyVotes(p.vote_window)
        : null;

      const out: import('../../shared/types/mission').VoteStateResponse = {
        window: p.vote_window ?? null,
        tallies,
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Open vote error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * POST /api/mission/vote
 * Cast a vote for an option
 */
missionRouter.post(
  '/vote',
  async (
    req: Request,
    res: Response<ApiResp<import('../../shared/types/mission').VoteStateResponse>>
  ) => {
    try {
      const s = svc(req);
      const user = await currentUser(req);
      const body = (req.body ?? {}) as import('../../shared/types/mission').VoteCastRequest;

      const { post, tallies } = await s.castVote(user, body.optionId);

      const out: import('../../shared/types/mission').VoteStateResponse = {
        window: post.vote_window ?? null,
        tallies,
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Cast vote error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * POST /api/mission/close-vote
 * Close the current vote window (scheduler or mod)
 */
missionRouter.post(
  '/close-vote',
  async (
    req: Request,
    res: Response<ApiResp<import('../../shared/types/mission').VoteStateResponse>>
  ) => {
    try {
      const s = svc(req);
      const { post, tallies } = await s.closeVote(true);

      const out: import('../../shared/types/mission').VoteStateResponse = {
        window: post.vote_window ?? null,
        tallies,
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Close vote error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

/**
 * GET /api/mission/vote-state
 * Get current vote window state and tallies
 */
missionRouter.get(
  '/vote-state',
  async (
    req: Request,
    res: Response<ApiResp<import('../../shared/types/mission').VoteStateResponse>>
  ) => {
    try {
      const { postData } = buildMissionAdapters(req);
      const p = await postData.read();

      const { tallyVotes } = await import('../services/voting');
      const tallies = p.vote_window && p.vote_window.status === 'open'
        ? tallyVotes(p.vote_window)
        : null;

      const out: import('../../shared/types/mission').VoteStateResponse = {
        window: p.vote_window ?? null,
        tallies,
        server_now: new Date().toISOString(),
      };

      res.json({ ok: true, data: out });
    } catch (e: any) {
      console.error('[Mission API] Get vote state error:', e);
      res.status(400).json({ ok: false, error: e.message });
    }
  }
);

