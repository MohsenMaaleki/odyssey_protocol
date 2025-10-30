import type { RedisClient } from '@devvit/public-api';
import type {
  HudMessage,
  TimerMessage,
  TimerKind,
  TimerStatus,
  HudData,
} from '../../shared/types/realtime.js';

export class RealtimeService {
  constructor(
    private realtime: any,
    private redis: RedisClient
  ) {}

  /**
   * Publish HUD update to realtime channel
   */
  async publishHudUpdate(
    missionId: string,
    hudData: HudData,
    full: boolean = false
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const message: HudMessage = {
      t: 'hud',
      mission_id: missionId,
      ts: Date.now(),
      hud: hudData,
      full,
    };

    try {
      await this.realtime.send(`rt:mission:${missionId}:hud`, message);
      console.log(
        `[Realtime] [${timestamp}] Published HUD update for mission ${missionId}`,
        { full, hudData }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to publish HUD update for mission ${missionId}:`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          hudData,
          full,
        }
      );
      throw error;
    }
  }

  /**
   * Publish timer state to realtime channel
   */
  async publishTimerState(
    missionId: string,
    timerKind: TimerKind,
    endsAt: Date,
    status: TimerStatus
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const message: TimerMessage = {
      t: 'timer',
      mission_id: missionId,
      ts: Date.now(),
      timer: {
        kind: timerKind,
        ends_at: endsAt.toISOString(),
        now: new Date().toISOString(),
        status,
      },
    };

    try {
      await this.realtime.send(`rt:mission:${missionId}:timer`, message);
      console.log(
        `[Realtime] [${timestamp}] Published timer state for mission ${missionId}`,
        {
          kind: timerKind,
          status,
          endsAt: endsAt.toISOString(),
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to publish timer state for mission ${missionId}:`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timerKind,
          status,
          endsAt: endsAt.toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Start a countdown timer with scheduled action
   */
  async startCountdown(
    missionId: string,
    timerKind: TimerKind,
    durationMs: number,
    schedulerJobName: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const endsAt = new Date(Date.now() + durationMs);

    try {
      // Store deadline in PostData
      await this.storeTimerDeadline(missionId, timerKind, endsAt);

      // Schedule server action
      await this.scheduleTimerEnd(missionId, schedulerJobName, endsAt);

      // Publish timer start
      await this.publishTimerState(missionId, timerKind, endsAt, 'running');

      console.log(
        `[Realtime] [${timestamp}] Started countdown for mission ${missionId}`,
        {
          kind: timerKind,
          durationMs,
          endsAt: endsAt.toISOString(),
          jobName: schedulerJobName,
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to start countdown for mission ${missionId}:`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timerKind,
          durationMs,
          jobName: schedulerJobName,
        }
      );
      throw error;
    }
  }

  /**
   * Pause a countdown timer
   */
  async pauseCountdown(
    missionId: string,
    timerKind: TimerKind,
    remainingMs: number
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const endsAt = new Date(Date.now() + remainingMs);

    try {
      // Update PostData with paused state
      await this.storeTimerDeadline(missionId, timerKind, endsAt);

      // Publish timer pause
      await this.publishTimerState(missionId, timerKind, endsAt, 'paused');

      console.log(
        `[Realtime] [${timestamp}] Paused countdown for mission ${missionId}`,
        {
          kind: timerKind,
          remainingMs,
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to pause countdown for mission ${missionId}:`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timerKind,
          remainingMs,
        }
      );
      throw error;
    }
  }

  /**
   * Resume a paused countdown timer
   */
  async resumeCountdown(
    missionId: string,
    timerKind: TimerKind,
    remainingMs: number,
    schedulerJobName: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const endsAt = new Date(Date.now() + remainingMs);

    try {
      // Update PostData with new deadline
      await this.storeTimerDeadline(missionId, timerKind, endsAt);

      // Reschedule server action
      await this.scheduleTimerEnd(missionId, schedulerJobName, endsAt);

      // Publish timer resume
      await this.publishTimerState(missionId, timerKind, endsAt, 'running');

      console.log(
        `[Realtime] [${timestamp}] Resumed countdown for mission ${missionId}`,
        {
          kind: timerKind,
          remainingMs,
          jobName: schedulerJobName,
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to resume countdown for mission ${missionId}:`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timerKind,
          remainingMs,
          jobName: schedulerJobName,
        }
      );
      throw error;
    }
  }

  /**
   * End a countdown timer
   */
  async endCountdown(missionId: string, timerKind: TimerKind): Promise<void> {
    const timestamp = new Date().toISOString();
    const endsAt = new Date(); // Already ended

    try {
      // Clear deadline from PostData
      await this.clearTimerDeadline(missionId, timerKind);

      // Publish timer end
      await this.publishTimerState(missionId, timerKind, endsAt, 'ended');

      console.log(
        `[Realtime] [${timestamp}] Ended countdown for mission ${missionId}`,
        { kind: timerKind }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to end countdown for mission ${missionId}:`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timerKind,
        }
      );
      throw error;
    }
  }

  /**
   * Store timer deadline in PostData
   */
  private async storeTimerDeadline(
    missionId: string,
    timerKind: TimerKind,
    endsAt: Date
  ): Promise<void> {
    const fieldMap: Record<TimerKind, string> = {
      LAUNCH: 'launch_countdown_until',
      BALLOT: 'choices_open_until',
      PHASE: 'phase_gate_until',
    };

    const field = fieldMap[timerKind];
    
    try {
      await this.redis.hSet(`mission:${missionId}:postdata`, {
        [field]: endsAt.toISOString(),
      });
    } catch (error) {
      const timestamp = new Date().toISOString();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to store timer deadline for mission ${missionId}:`,
        {
          error: errorMessage,
          timerKind,
          field,
          endsAt: endsAt.toISOString(),
        }
      );
      throw error;
    }
  }

  /**
   * Clear timer deadline from PostData
   */
  private async clearTimerDeadline(missionId: string, timerKind: TimerKind): Promise<void> {
    const fieldMap: Record<TimerKind, string> = {
      LAUNCH: 'launch_countdown_until',
      BALLOT: 'choices_open_until',
      PHASE: 'phase_gate_until',
    };

    const field = fieldMap[timerKind];
    
    try {
      await this.redis.hSet(`mission:${missionId}:postdata`, {
        [field]: '',
      });
    } catch (error) {
      const timestamp = new Date().toISOString();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to clear timer deadline for mission ${missionId}:`,
        {
          error: errorMessage,
          timerKind,
          field,
        }
      );
      throw error;
    }
  }

  /**
   * Schedule timer end action
   */
  private async scheduleTimerEnd(
    missionId: string,
    jobName: string,
    endsAt: Date
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    
    try {
      // Store job metadata for later execution
      const jobData = {
        endsAt: endsAt.toISOString(),
        missionId,
        scheduledAt: timestamp,
      };

      await this.redis.hSet(`mission:${missionId}:scheduled_jobs`, {
        [jobName]: JSON.stringify(jobData),
      });

      console.log(
        `[Realtime] [${timestamp}] Scheduled job ${jobName} for mission ${missionId} at ${endsAt.toISOString()}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] [${timestamp}] Failed to schedule job ${jobName} for mission ${missionId}:`,
        {
          error: errorMessage,
          jobName,
          endsAt: endsAt.toISOString(),
        }
      );
      throw error;
    }
  }
}
