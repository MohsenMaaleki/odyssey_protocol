import type { CreditReason } from '../../shared/types/leaderboard';

/**
 * Point values for each credit reason (should match server defaults)
 */
const POINT_VALUES: Record<CreditReason, number> = {
  ACTION_DECISIVE: 3,
  MISSION_SUCCESS: 5,
  MISSION_FAIL: 1,
  MISSION_ABORT: 1,
  VOTE_PARTICIPATION: 1,
};

/**
 * User-friendly messages for each credit reason
 */
const CREDIT_MESSAGES: Record<CreditReason, string> = {
  ACTION_DECISIVE: 'Decisive Action',
  MISSION_SUCCESS: 'Mission Success',
  MISSION_FAIL: 'Mission Participation',
  MISSION_ABORT: 'Mission Participation',
  VOTE_PARTICIPATION: 'Vote Participation',
};

/**
 * Format a point award notification message
 *
 * @param reason - The credit reason
 * @param points - Optional custom point value (uses default if not provided)
 * @returns Formatted message like "+3 pts for Decisive Action"
 */
export function formatPointAwardMessage(reason: CreditReason, points?: number): string {
  const pointValue = points ?? POINT_VALUES[reason];
  const message = CREDIT_MESSAGES[reason];
  return `+${pointValue} pts for ${message}`;
}

/**
 * Show a toast notification for a point award
 * This should be called after the server confirms the credit
 *
 * @param showToast - The toast function from useToast hook
 * @param reason - The credit reason
 * @param points - Optional custom point value
 */
export function showPointAwardToast(
  showToast: (message: string, type: 'success' | 'error' | 'info') => void,
  reason: CreditReason,
  points?: number
): void {
  const message = formatPointAwardMessage(reason, points);
  showToast(message, 'success');
}
