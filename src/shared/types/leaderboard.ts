// Credit Reasons
export type CreditReason =
  | 'ACTION_DECISIVE'
  | 'MISSION_SUCCESS'
  | 'MISSION_FAIL'
  | 'MISSION_ABORT'
  | 'VOTE_PARTICIPATION';

// Leaderboard Entry
export interface LeaderboardEntry {
  username: string;
  points: number;
  rank: number;
}

// Personal Rank Response
export interface PersonalRank {
  username: string;
  points: number;
  rank: number | null; // null if banned or no points
  banned?: boolean;
}

// Credit Result
export interface CreditResult {
  ok: boolean;
  newTotal: number;
  message?: string;
}

// Bulk Credit Result
export interface BulkCreditResult {
  ok: boolean;
  updated: number;
  skipped: string[]; // Usernames that were skipped (banned or duplicate)
}

// Season Reset Result
export interface SeasonResetResult {
  ok: boolean;
  season: number;
  message?: string;
}

// Ban Result
export interface BanResult {
  ok: boolean;
  username: string;
  banned: boolean;
  message?: string;
}

// Metadata Structure
export interface LeaderboardMetadata {
  season: number;
  season_started_at: string;
  season_ends_at: string | null;
  last_reset_at: string | null;
  banlist: string[];
  point_rules: {
    ACTION_DECISIVE: number;
    MISSION_SUCCESS: number;
    MISSION_FAIL: number;
    MISSION_ABORT: number;
    VOTE_PARTICIPATION: number;
  };
}

// API Request Types

export interface CreditPointsRequest {
  mission_id: string;
  username: string;
  reason: CreditReason;
  points?: number; // Optional override
}

export interface BulkCreditPointsRequest {
  mission_id: string;
  usernames: string[];
  reason: CreditReason;
  points?: number; // Optional override
}

export interface ResetSeasonRequest {
  season_ends_at?: string; // Optional end date for new season
}

export interface BanUserRequest {
  username: string;
  ban: boolean; // true to ban, false to unban
}

// API Response Types

export interface GetTopResponse {
  entries: LeaderboardEntry[];
  season: number;
  season_started_at: string;
  season_ends_at: string | null;
}

export type GetPersonalRankResponse = PersonalRank;

export type CreditPointsResponse = CreditResult;

export type BulkCreditPointsResponse = BulkCreditResult;

export type ResetSeasonResponse = SeasonResetResult;

export type BanUserResponse = BanResult;
