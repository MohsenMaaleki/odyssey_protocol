import type { RealtimeService } from '../services/realtime.js';
import type { HudData, TimerKind } from '../../shared/types/realtime.js';

/**
 * Helper functions for publishing realtime updates from game logic
 * These should be called whenever mission stats or phase changes occur
 */

/**
 * Publish HUD update when mission stats change
 * Call this after modifying fuel, hull, crew, success, or science points
 */
export async function publishHudUpdate(
  realtimeService: RealtimeService,
  missionId: string,
  hudData: HudData,
  isPhaseTransition: boolean = false
): Promise<void> {
  try {
    await realtimeService.publishHudUpdate(missionId, hudData, isPhaseTransition);
  } catch (error) {
    console.error(`[Realtime Helper] Failed to publish HUD update for mission ${missionId}:`, error);
    // Don't throw - HUD updates are non-critical
  }
}

/**
 * Publish full HUD snapshot on phase transition
 * Call this when transitioning between phases (DESIGN→LAUNCH, LAUNCH→FLIGHT, etc.)
 */
export async function publishPhaseTransition(
  realtimeService: RealtimeService,
  missionId: string,
  newPhase: string,
  allStats: {
    fuel: number;
    hull: number;
    crew: number;
    success: number;
    scienceDelta: number;
  }
): Promise<void> {
  try {
    await realtimeService.publishHudUpdate(
      missionId,
      {
        phase: newPhase,
        ...allStats,
      },
      true // full snapshot
    );
    console.log(`[Realtime Helper] Published phase transition to ${newPhase} for mission ${missionId}`);
  } catch (error) {
    console.error(`[Realtime Helper] Failed to publish phase transition for mission ${missionId}:`, error);
  }
}

/**
 * Start a countdown timer
 * Call this when entering a timed phase
 */
export async function startMissionTimer(
  realtimeService: RealtimeService,
  missionId: string,
  timerKind: TimerKind,
  durationMs: number
): Promise<void> {
  try {
    const jobName = `timer_${timerKind.toLowerCase()}_${missionId}`;
    await realtimeService.startCountdown(missionId, timerKind, durationMs, jobName);
    console.log(`[Realtime Helper] Started ${timerKind} timer for mission ${missionId}, duration: ${durationMs}ms`);
  } catch (error) {
    console.error(`[Realtime Helper] Failed to start timer for mission ${missionId}:`, error);
    throw error; // Timers are critical
  }
}

/**
 * Pause a countdown timer
 * Call this when pausing a mission phase
 */
export async function pauseMissionTimer(
  realtimeService: RealtimeService,
  missionId: string,
  timerKind: TimerKind,
  remainingMs: number
): Promise<void> {
  try {
    await realtimeService.pauseCountdown(missionId, timerKind, remainingMs);
    console.log(`[Realtime Helper] Paused ${timerKind} timer for mission ${missionId}`);
  } catch (error) {
    console.error(`[Realtime Helper] Failed to pause timer for mission ${missionId}:`, error);
    throw error;
  }
}

/**
 * Resume a countdown timer
 * Call this when resuming a paused mission phase
 */
export async function resumeMissionTimer(
  realtimeService: RealtimeService,
  missionId: string,
  timerKind: TimerKind,
  remainingMs: number
): Promise<void> {
  try {
    const jobName = `timer_${timerKind.toLowerCase()}_${missionId}`;
    await realtimeService.resumeCountdown(missionId, timerKind, remainingMs, jobName);
    console.log(`[Realtime Helper] Resumed ${timerKind} timer for mission ${missionId}`);
  } catch (error) {
    console.error(`[Realtime Helper] Failed to resume timer for mission ${missionId}:`, error);
    throw error;
  }
}

/**
 * End a countdown timer
 * Call this when a timer expires or is cancelled
 */
export async function endMissionTimer(
  realtimeService: RealtimeService,
  missionId: string,
  timerKind: TimerKind
): Promise<void> {
  try {
    await realtimeService.endCountdown(missionId, timerKind);
    console.log(`[Realtime Helper] Ended ${timerKind} timer for mission ${missionId}`);
  } catch (error) {
    console.error(`[Realtime Helper] Failed to end timer for mission ${missionId}:`, error);
    // Don't throw - ending is non-critical
  }
}

/**
 * Example usage in game logic:
 * 
 * // When fuel changes:
 * await publishHudUpdate(realtimeService, missionId, { fuel: newFuelValue });
 * 
 * // When transitioning to LAUNCH phase:
 * await publishPhaseTransition(realtimeService, missionId, 'LAUNCH', {
 *   fuel: 100, hull: 100, crew: 100, success: 50, scienceDelta: 0
 * });
 * await startMissionTimer(realtimeService, missionId, 'LAUNCH', 30000); // 30 seconds
 * 
 * // When ballot opens:
 * await startMissionTimer(realtimeService, missionId, 'BALLOT', 300000); // 5 minutes
 */
