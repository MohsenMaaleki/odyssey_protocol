import type { CreditReason } from '../../shared/types/leaderboard';
import { showPointAwardToast } from './pointNotifications';

/**
 * Example utility functions for game actions with leaderboard integration
 * These demonstrate how to call the game API and show toast notifications
 */

/**
 * Perform a game action and show toast if points are awarded
 *
 * @param missionId - The mission identifier
 * @param action - The action data
 * @param isDecisive - Whether this action triggers a phase transition
 * @param showToast - Toast function from useToast hook
 * @returns Response data from the server
 */
export async function performGameAction(
  missionId: string,
  action: unknown,
  isDecisive: boolean,
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<{ success: boolean; pointsAwarded: boolean; message: string }> {
  try {
    const response = await fetch('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, action, isDecisive }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Show toast notification if points were awarded
    if (data.success && data.pointsAwarded) {
      showPointAwardToast(showToast, 'ACTION_DECISIVE');
    }

    return data;
  } catch (error) {
    console.error('Game action failed:', error);
    showToast('Action failed', 'error');
    return { success: false, pointsAwarded: false, message: 'Action failed' };
  }
}

/**
 * Complete a mission and show toast for point awards
 *
 * @param missionId - The mission identifier
 * @param outcome - The mission outcome
 * @param showToast - Toast function from useToast hook
 * @returns Response data from the server
 */
export async function completeMission(
  missionId: string,
  outcome: 'success' | 'fail' | 'abort',
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
): Promise<{ success: boolean; credited: number; skipped: string[]; message: string }> {
  try {
    const response = await fetch('/api/game/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, outcome }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Show toast notification for mission completion
    if (data.success && data.credited > 0) {
      const reason: CreditReason =
        outcome === 'success'
          ? 'MISSION_SUCCESS'
          : outcome === 'fail'
            ? 'MISSION_FAIL'
            : 'MISSION_ABORT';

      showPointAwardToast(showToast, reason);
    }

    return data;
  } catch (error) {
    console.error('Mission completion failed:', error);
    showToast('Mission completion failed', 'error');
    return { success: false, credited: 0, skipped: [], message: 'Mission completion failed' };
  }
}

/**
 * Get participants for a mission
 *
 * @param missionId - The mission identifier
 * @returns Array of participant usernames
 */
export async function getMissionParticipants(missionId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/game/mission/${missionId}/participants`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.participants || [];
  } catch (error) {
    console.error('Failed to get participants:', error);
    return [];
  }
}
