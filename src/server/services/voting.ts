// server/services/voting.ts
// Voting system helpers for Phase 2
// Devvit v0.12 refs:
// - Post Data: https://developers.reddit.com/docs/interactive_posts/post-data
// - Realtime: https://developers.reddit.com/docs/realtime/
// - Scheduler: https://developers.reddit.com/docs/scheduled-actions/

import type {
  VoteWindow,
  VoteOptionId,
  VoteTallies,
} from '../../shared/types/mission';

/**
 * Tally votes from a vote window
 * Implements tie-breaking: highest count wins, if tied, earliest first vote wins
 */
export function tallyVotes(win: VoteWindow): VoteTallies {
  const perOption: Record<VoteOptionId, number> = {};
  
  // Initialize all options with 0 votes
  win.options.forEach((o) => (perOption[o] = 0));
  
  // Count votes
  Object.values(win.ballots).forEach((o) => {
    if (perOption[o] !== undefined) perOption[o]++;
  });
  
  const total = Object.values(perOption).reduce((a, b) => a + b, 0);
  
  // Sort by (count desc, firstVoteAt asc)
  const ranking = [...win.options].sort((a, b) => {
    const ca = perOption[a] ?? 0;
    const cb = perOption[b] ?? 0;
    
    // Higher count wins
    if (cb !== ca) return cb - ca;
    
    // Tie-breaker: earlier first vote wins
    const ta = win.option_first_vote_at[a] ?? '9999-12-31T23:59:59.999Z';
    const tb = win.option_first_vote_at[b] ?? '9999-12-31T23:59:59.999Z';
    return ta.localeCompare(tb);
  });
  
  const top = ranking[0] ?? null;
  const winner = total === 0 ? null : top;
  
  return { total, perOption, ranking, winner };
}

/**
 * Get all voters who voted for a specific option
 */
export function getVotersForOption(
  win: VoteWindow,
  optionId: VoteOptionId
): string[] {
  return Object.entries(win.ballots)
    .filter(([, opt]) => opt === optionId)
    .map(([user]) => user);
}
