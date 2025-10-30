/**
 * Mission Suggestion API client utilities
 * Handles communication with mission suggestion and ballot endpoints
 */

import type {
  SubmitSuggestionRequest,
  SubmitSuggestionResponse,
  VoteSuggestionRequest,
  VoteSuggestionResponse,
  ListSuggestionsRequest,
  ListSuggestionsResponse,
  ApproveSuggestionRequest,
  ApproveSuggestionResponse,
  RejectSuggestionRequest,
  RejectSuggestionResponse,
  CreateBallotRequest,
  CreateBallotResponse,
  GetCurrentBallotResponse,
  CloseBallotRequest,
  CloseBallotResponse,
  GetPromotedMissionResponse,
} from '../../shared/types/missionSuggestions';

// ============================================================================
// Suggestion API Functions
// ============================================================================

/**
 * Submit a new mission suggestion
 */
export async function submitSuggestion(
  data: SubmitSuggestionRequest
): Promise<SubmitSuggestionResponse> {
  const response = await fetch('/api/missions/suggest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  return result;
}

/**
 * Vote on a suggestion
 */
export async function voteSuggestion(
  suggestionId: string,
  value: -1 | 0 | 1
): Promise<VoteSuggestionResponse> {
  const body: VoteSuggestionRequest = { suggestionId, value };

  const response = await fetch('/api/missions/suggest/vote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  return result;
}

/**
 * List suggestions with filtering and pagination
 */
export async function listSuggestions(
  params: ListSuggestionsRequest = {}
): Promise<ListSuggestionsResponse> {
  const queryParams = new URLSearchParams();

  if (params.status) queryParams.append('status', params.status);
  if (params.page !== undefined) queryParams.append('page', params.page.toString());
  if (params.perPage !== undefined) queryParams.append('perPage', params.perPage.toString());
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.filterUsername) queryParams.append('filterUsername', params.filterUsername);

  const url = `/api/missions/suggest/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url);

  const result = await response.json();
  return result;
}

/**
 * Reset all mission suggestions data (moderator only, for debugging)
 */
export async function resetSuggestionsData(): Promise<{ ok: boolean; message?: string }> {
  console.log('[API] resetSuggestionsData called');
  
  const response = await fetch('/api/missions/suggest/mod/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('[API] Reset response status:', response.status);
  const result = await response.json();
  console.log('[API] Reset response body:', result);
  return result;
}

/**
 * Approve a suggestion (moderator only)
 */
export async function approveSuggestion(
  suggestionId: string
): Promise<ApproveSuggestionResponse> {
  console.log('[API] approveSuggestion called with ID:', suggestionId);
  const body: ApproveSuggestionRequest = { suggestionId };

  console.log('[API] Making POST request to /api/missions/suggest/mod/approve');
  console.log('[API] Request body:', JSON.stringify(body));
  
  const response = await fetch('/api/missions/suggest/mod/approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('[API] Response status:', response.status);
  console.log('[API] Response headers:', response.headers);
  const result = await response.json();
  console.log('[API] Response body:', JSON.stringify(result));
  return result;
}

/**
 * Reject a suggestion (moderator only)
 */
export async function rejectSuggestion(
  suggestionId: string,
  reason?: string
): Promise<RejectSuggestionResponse> {
  console.log('[API] rejectSuggestion called with ID:', suggestionId);
  const body: RejectSuggestionRequest = { suggestionId };
  if (reason !== undefined) {
    body.reason = reason;
  }

  console.log('[API] Making POST request to /api/missions/suggest/mod/reject');
  console.log('[API] Request body:', JSON.stringify(body));
  
  const response = await fetch('/api/missions/suggest/mod/reject', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('[API] Response status:', response.status);
  console.log('[API] Response headers:', response.headers);
  const result = await response.json();
  console.log('[API] Response body:', JSON.stringify(result));
  return result;
}

// ============================================================================
// Ballot API Functions
// ============================================================================

/**
 * Create a new ballot (moderator only)
 */
export async function createBallot(
  suggestionIds: string[],
  closesInMinutes: number
): Promise<CreateBallotResponse> {
  const body: CreateBallotRequest = { suggestionIds, closesInMinutes };

  const response = await fetch('/api/missions/ballot/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  return result;
}

/**
 * Get the current open ballot
 */
export async function getCurrentBallot(): Promise<GetCurrentBallotResponse> {
  const response = await fetch('/api/missions/ballot/current');

  const result = await response.json();
  return result;
}

/**
 * Close a ballot (moderator only or scheduled action)
 */
export async function closeBallot(ballotId: string): Promise<CloseBallotResponse> {
  const body: CloseBallotRequest = { ballotId };

  const response = await fetch('/api/missions/ballot/close', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  return result;
}

/**
 * Get the promoted mission for game integration
 */
export async function getPromotedMission(): Promise<GetPromotedMissionResponse> {
  const response = await fetch('/api/missions/ballot/promoted');

  const result = await response.json();
  return result;
}
