export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

// Gallery-related responses
export type {
  GalleryEntry,
  SavePatchRequest,
  SavePatchResponse,
  ListGalleryRequest,
  ListGalleryResponse,
  GetGalleryItemResponse,
  DeleteGalleryItemResponse,
} from './gallery.js';

// Leaderboard-related types
export type {
  CreditReason,
  LeaderboardEntry,
  PersonalRank,
  CreditResult,
  BulkCreditResult,
  SeasonResetResult,
  BanResult,
  LeaderboardMetadata,
  CreditPointsRequest,
  BulkCreditPointsRequest,
  ResetSeasonRequest,
  BanUserRequest,
  GetTopResponse,
  GetPersonalRankResponse,
  CreditPointsResponse,
  BulkCreditPointsResponse,
  ResetSeasonResponse,
  BanUserResponse,
} from './leaderboard.js';

// Mission Suggestions-related types
export type {
  Suggestion,
  Ballot,
  SuggestionsMeta,
  SubmitSuggestionRequest,
  VoteSuggestionRequest,
  ListSuggestionsRequest,
  ApproveSuggestionRequest,
  RejectSuggestionRequest,
  CreateBallotRequest,
  CloseBallotRequest,
  SubmitSuggestionResponse,
  VoteSuggestionResponse,
  PaginatedSuggestions,
  ListSuggestionsResponse,
  ApproveSuggestionResponse,
  RejectSuggestionResponse,
  CreateBallotResponse,
  GetCurrentBallotResponse,
  CloseBallotResponse,
  PromotedMission,
  GetPromotedMissionResponse,
  VoteValue,
  SuggestionStatus,
  BallotStatus,
  SortOrder,
  MissionTarget,
  RiskLevel,
  RewardType,
  PayloadHint,
} from './missionSuggestions.js';

// Realtime-related types
export type {
  BaseRealtimeMessage,
  HudData,
  HudMessage,
  TimerKind,
  TimerStatus,
  TimerData,
  TimerMessage,
  ToastSeverity,
  ToastMessage,
  RealtimeMessage,
} from './realtime.js';

// Mission-related types
export type {
  MissionSnapshotRequest,
  MissionTimers,
  MissionSnapshotResponse,
} from './mission.js';
