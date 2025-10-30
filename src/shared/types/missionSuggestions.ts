// Core data models

export interface Suggestion {
  id: string; // Format: "S-0001"
  title: string; // 4-60 chars
  target: string; // LEO, Moon, Mars, Deep Space, etc.
  risk: 'Low' | 'Medium' | 'High';
  reward: 'Science' | 'Unlock' | 'Prestige';
  description: string; // ≤ 280 chars
  payload_hint: 'Probe' | 'Hab' | 'Cargo' | 'Any';
  proposer: string; // Reddit username
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  votes: {
    up: number;
    down: number;
  };
  voters: Record<string, -1 | 0 | 1>; // username → vote value
  created_at: string; // ISO datetime
  curated_by: string | null; // Moderator username
  curated_at: string | null; // ISO datetime
  ballot_id: string | null; // Links to ballot if included
}

export interface Ballot {
  id: string; // Format: "B-0001"
  suggestion_ids: string[]; // 2-4 suggestion IDs
  created_at: string; // ISO datetime
  closes_at: string; // ISO datetime
  status: 'open' | 'closed' | 'promoted';
  winner_id: string | null; // Set when closed
}

export interface SuggestionsMeta {
  counter: number; // For generating S-XXXX IDs
  banlist: string[]; // Banned usernames
  min_account_age_days: number; // Optional policy (0 = disabled)
  max_suggestions_per_user: number; // Per season
  last_ballot_id: number; // For generating B-XXXX IDs
}

// API Request types

export interface SubmitSuggestionRequest {
  title: string;
  target: string;
  risk: 'Low' | 'Medium' | 'High';
  reward: 'Science' | 'Unlock' | 'Prestige';
  description: string;
  payload_hint: 'Probe' | 'Hab' | 'Cargo' | 'Any';
}

export interface VoteSuggestionRequest {
  suggestionId: string;
  value: -1 | 0 | 1;
}

export interface ListSuggestionsRequest {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  page?: number;
  perPage?: number;
  sort?: 'top' | 'new';
  filterUsername?: string;
}

export interface ApproveSuggestionRequest {
  suggestionId: string;
}

export interface RejectSuggestionRequest {
  suggestionId: string;
  reason?: string;
}

export interface CreateBallotRequest {
  suggestionIds: string[];
  closesInMinutes: number;
}

export interface CloseBallotRequest {
  ballotId: string;
}

// API Response types

export interface SubmitSuggestionResponse {
  ok: boolean;
  suggestion?: Suggestion;
  message?: string;
}

export interface VoteSuggestionResponse {
  ok: boolean;
  up: number;
  down: number;
  total: number;
  message?: string;
}

export interface PaginatedSuggestions {
  suggestions: Suggestion[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  };
}

export interface ListSuggestionsResponse {
  ok: boolean;
  data?: PaginatedSuggestions;
  message?: string;
}

export interface ApproveSuggestionResponse {
  ok: boolean;
  suggestion?: Suggestion;
  message?: string;
}

export interface RejectSuggestionResponse {
  ok: boolean;
  message?: string;
}

export interface CreateBallotResponse {
  ok: boolean;
  ballot?: Ballot;
  message?: string;
}

export interface GetCurrentBallotResponse {
  ok: boolean;
  ballot: Ballot | null;
  suggestions: Suggestion[];
}

export interface CloseBallotResponse {
  ok: boolean;
  winner_id?: string;
  message?: string;
}

export interface PromotedMission {
  suggestion: Suggestion | null;
  ballot: Ballot | null;
}

export interface GetPromotedMissionResponse {
  ok: boolean;
  data?: PromotedMission;
  message?: string;
}

// Utility types

export type VoteValue = -1 | 0 | 1;

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export type BallotStatus = 'open' | 'closed' | 'promoted';

export type SortOrder = 'top' | 'new';

export type MissionTarget = string; // Flexible for various targets

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type RewardType = 'Science' | 'Unlock' | 'Prestige';

export type PayloadHint = 'Probe' | 'Hab' | 'Cargo' | 'Any';
