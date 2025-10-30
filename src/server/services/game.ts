import type { LeaderboardService } from './leaderboard';

/**
 * Mission state interface for tracking participants
 */
export interface MissionState {
  mission_id: string;
  participants: Set<string>;
  phase: 'PLANNING' | 'LAUNCH' | 'MISSION' | 'RESULT';
}

/**
 * Game Service
 * Manages game state and integrates with leaderboard for point awards
 */
export class GameService {
  private leaderboardService: LeaderboardService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(leaderboardService: LeaderboardService, redis: any) {
    this.leaderboardService = leaderboardService;
    this.redis = redis;
  }

  /**
   * Get mission state from Redis
   *
   * @param missionId - The mission identifier
   * @returns Mission state or null if not found
   */
  private async getMissionState(missionId: string): Promise<MissionState | null> {
    try {
      const key = `mission:${missionId}:state`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      return {
        mission_id: parsed.mission_id,
        participants: new Set(parsed.participants || []),
        phase: parsed.phase || 'PLANNING',
      };
    } catch (error) {
      console.error(`Error getting mission state for ${missionId}:`, error);
      return null;
    }
  }

  /**
   * Save mission state to Redis
   *
   * @param state - The mission state to save
   */
  private async saveMissionState(state: MissionState): Promise<void> {
    try {
      const key = `mission:${state.mission_id}:state`;
      const data = JSON.stringify({
        mission_id: state.mission_id,
        participants: Array.from(state.participants),
        phase: state.phase,
      });

      // Store with 7 day expiration (missions shouldn't last longer than this)
      await this.redis.set(key, data, {
        expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (error) {
      console.error(`Error saving mission state for ${state.mission_id}:`, error);
    }
  }

  /**
   * Initialize a new mission
   *
   * @param missionId - The mission identifier
   * @returns The initialized mission state
   */
  async initializeMission(missionId: string): Promise<MissionState> {
    const state: MissionState = {
      mission_id: missionId,
      participants: new Set(),
      phase: 'PLANNING',
    };

    await this.saveMissionState(state);
    return state;
  }

  /**
   * Record a participant in the mission
   * This should be called whenever a user performs any valid action during a mission
   *
   * @param missionId - The mission identifier
   * @param username - The username to record as a participant
   */
  async recordParticipant(missionId: string, username: string): Promise<void> {
    try {
      let state = await this.getMissionState(missionId);

      // Initialize mission if it doesn't exist
      if (!state) {
        state = await this.initializeMission(missionId);
      }

      // Add participant to the set
      state.participants.add(username);

      // Save updated state
      await this.saveMissionState(state);

      console.log(`Recorded ${username} as participant in mission ${missionId}`);
    } catch (error) {
      console.error(`Error recording participant ${username} for mission ${missionId}:`, error);
    }
  }

  /**
   * Get all participants for a mission
   *
   * @param missionId - The mission identifier
   * @returns Array of participant usernames
   */
  async getParticipants(missionId: string): Promise<string[]> {
    try {
      const state = await this.getMissionState(missionId);
      return state ? Array.from(state.participants) : [];
    } catch (error) {
      console.error(`Error getting participants for mission ${missionId}:`, error);
      return [];
    }
  }

  /**
   * Handle a decisive action that triggers a phase transition
   * Awards points to the user who performed the decisive action
   *
   * @param missionId - The mission identifier
   * @param username - The username who performed the action
   * @returns True if points were awarded, false otherwise
   */
  async handleDecisiveAction(missionId: string, username: string): Promise<boolean> {
    try {
      // Award points for decisive action
      const result = await this.leaderboardService.creditPoints(
        missionId,
        username,
        'ACTION_DECISIVE'
      );

      if (result.ok) {
        console.log(
          `Awarded ACTION_DECISIVE points to ${username} for mission ${missionId}. New total: ${result.newTotal}`
        );
        return true;
      } else {
        console.log(
          `Could not award ACTION_DECISIVE points to ${username}: ${result.message || 'Unknown reason'}`
        );
        return false;
      }
    } catch (error) {
      // Log error but don't block game flow
      console.error(
        `Error awarding ACTION_DECISIVE points to ${username} for mission ${missionId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Handle mission completion and award points to all participants
   *
   * @param missionId - The mission identifier
   * @param outcome - The mission outcome ('success', 'fail', or 'abort')
   * @returns Object with success status and number of users credited
   */
  async handleMissionCompletion(
    missionId: string,
    outcome: 'success' | 'fail' | 'abort'
  ): Promise<{ success: boolean; credited: number; skipped: string[] }> {
    try {
      // Get all participants for this mission
      const participants = await this.getParticipants(missionId);

      if (participants.length === 0) {
        console.log(`No participants found for mission ${missionId}`);
        return { success: true, credited: 0, skipped: [] };
      }

      // Determine credit reason based on outcome
      let reason: 'MISSION_SUCCESS' | 'MISSION_FAIL' | 'MISSION_ABORT';
      switch (outcome) {
        case 'success':
          reason = 'MISSION_SUCCESS';
          break;
        case 'fail':
          reason = 'MISSION_FAIL';
          break;
        case 'abort':
          reason = 'MISSION_ABORT';
          break;
        default:
          console.error(`Invalid mission outcome: ${outcome}`);
          return { success: false, credited: 0, skipped: [] };
      }

      // Bulk credit all participants
      const result = await this.leaderboardService.bulkCreditPoints(
        missionId,
        participants,
        reason
      );

      if (result.ok) {
        console.log(
          `Mission ${missionId} completed with outcome ${outcome}. Credited ${result.updated} participants. Skipped: ${result.skipped.join(', ') || 'none'}`
        );
        return { success: true, credited: result.updated, skipped: result.skipped };
      } else {
        console.error(`Failed to credit participants for mission ${missionId}`);
        return { success: false, credited: 0, skipped: [] };
      }
    } catch (error) {
      // Log error but don't block game flow
      console.error(`Error handling mission completion for ${missionId}:`, error);
      return { success: false, credited: 0, skipped: [] };
    }
  }

  /**
   * Handle vote participation and award points (optional feature)
   * This awards 1 point for any valid action during a mission
   * Idempotency ensures each user only gets credited once per mission
   *
   * @param missionId - The mission identifier
   * @param username - The username who performed the action
   * @returns True if points were awarded, false otherwise
   */
  async handleVoteParticipation(missionId: string, username: string): Promise<boolean> {
    try {
      // Award points for vote participation
      // Idempotency will rate-limit this to once per user per mission
      const result = await this.leaderboardService.creditPoints(
        missionId,
        username,
        'VOTE_PARTICIPATION'
      );

      if (result.ok && result.message !== 'Credit already applied') {
        console.log(
          `Awarded VOTE_PARTICIPATION points to ${username} for mission ${missionId}. New total: ${result.newTotal}`
        );
        return true;
      } else {
        // Already credited or banned - this is expected behavior
        return false;
      }
    } catch (error) {
      // Log error but don't block game flow
      console.error(
        `Error awarding VOTE_PARTICIPATION points to ${username} for mission ${missionId}:`,
        error
      );
      return false;
    }
  }
}
