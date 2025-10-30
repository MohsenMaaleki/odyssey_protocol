// shared/types/mission.ts
// Mission Core MVP types for Odyssey Protocol
// Devvit v0.12 docs refs:
// - Interactive Posts: https://developers.reddit.com/docs/interactive_posts/
// - Post Data (per-post state): https://developers.reddit.com/docs/interactive_posts/post-data
// - Storage API: https://developers.reddit.com/docs/storage/
// - Realtime: https://developers.reddit.com/docs/realtime/
// - Scheduled Actions: https://developers.reddit.com/docs/scheduled-actions/

export type MissionPhase = 'IDLE' | 'DESIGN' | 'LAUNCH' | 'FLIGHT' | 'RESULT';
export type MissionOutcome = 'success' | 'fail' | 'abort' | null;
export type PayloadKind = 'Probe' | 'Hab' | 'Cargo' | null;
export type EngineKind = 'Light' | 'Heavy' | 'Advanced' | null;
export type MissionType = 'LunarOrbit' | 'MarsFlyby' | 'AsteroidSurvey';
export type FuelTankSize = 'S' | 'M' | 'L' | 'XL';

// Phase 2: Voting system types
export type VotePhase = 'DESIGN' | 'LAUNCH' | 'FLIGHT';
export type VoteOptionId = string; // e.g., "design_finalize", "hold_course", "course_correction"

export interface VoteWindow {
  id: string; // e.g., `vote:${mission_id}:${timestamp}`
  phase: VotePhase;
  options: VoteOptionId[]; // whitelisted option ids
  ends_at: string; // ISO time (server)
  opened_at: string; // ISO
  status: 'open' | 'closed';
  // user -> chosen option; idempotent (latest wins until close)
  ballots: Record<string, VoteOptionId>;
  // option -> first vote ISO (for tie-break: earliest first vote wins)
  option_first_vote_at: Record<VoteOptionId, string>;
}

export interface VoteTallies {
  total: number;
  perOption: Record<VoteOptionId, number>;
  // sorted options by (count desc, earliest first vote asc)
  ranking: VoteOptionId[];
  winner: VoteOptionId | null;
}

export interface MissionPostData {
  mission_id: string | null;
  phase: MissionPhase;
  fuel: number; // 0..100
  hull: number; // 0..100
  crew: number; // 0..100
  success: number; // 0..100 (success chance indicator)
  payload: PayloadKind;
  engine: EngineKind;
  participants: string[]; // unique usernames that performed valid actions
  decisive_actions: string[]; // usernames who advanced a phase
  started_at: string | null; // ISO
  phase_started_at: string | null; // ISO
  launch_countdown_until?: string | null; // ISO
  science_points_delta?: number; // computed at RESULT
  outcome?: MissionOutcome;
  promoted_title?: string | null; // optional from ballot winner
  promoted_payload_hint?: PayloadKind; // optional
  
  // Phase 2 additions
  mission_type?: MissionType; // selected mission type
  fuel_max?: number; // affected by fuel tank unlocks (cap UI at 100 for now)
  fuel_tank?: FuelTankSize; // selected tank size
  vote_window?: VoteWindow | null; // only one active window at a time for MVP
}

export interface MissionSnapshotResponse {
  mission_id: string | null;
  phase: MissionPhase;
  fuel: number;
  hull: number;
  crew: number;
  success: number;
  payload: PayloadKind;
  engine: EngineKind;
  science_points_delta?: number | undefined;
  outcome?: MissionOutcome | undefined;
  timers: {
    launch_countdown_until?: string | null | undefined;
    vote_window_until?: string | null | undefined; // Phase 2: voting deadline
  };
  // Phase 2 additions
  mission_type?: MissionType;
  fuel_max?: number;
  fuel_tank?: FuelTankSize;
  vote_window?: VoteWindow | null;
  server_now: string; // ISO
}

// --- Requests ---
export interface StartMissionRequest {
  usePromoted?: boolean; // if true, prefill from promoted ballot winner if present
}

export interface SelectMissionRequest {
  mission_type: MissionType;
}

export interface DesignActionRequest {
  // Only one of these fields is acted upon per call
  setPayload?: Exclude<PayloadKind, null>;
  addFuel?: number; // +10 (cap to 100)
  pickEngine?: Exclude<EngineKind, null>;
  selectTank?: FuelTankSize;
}

export interface FinalizeDesignRequest {} // no body needed for MVP

export interface LaunchRequest {
  // no body needed; manual launch (scheduler will also call server-side)
}

export interface FlightActionRequest {
  action: 'HoldCourse' | 'CourseCorrection' | 'RunExperiment';
}

export interface AcknowledgeRequest {} // finalize & distribute rewards

// Phase 2: Voting requests
export interface VoteOpenRequest {
  phase: VotePhase;
  options: VoteOptionId[];
  durationSec: number; // e.g., 120
}

export interface VoteCastRequest {
  optionId: VoteOptionId; // must be in window.options
}

export interface VoteCloseRequest {} // scheduler/mod closes current window

export interface VoteStateResponse {
  window: VoteWindow | null;
  tallies: VoteTallies | null;
  server_now: string;
}

// --- Generic API envelope ---
export interface Ok<T> {
  ok: true;
  data: T;
}
export interface Fail {
  ok: false;
  error: string;
}
export type ApiResp<T> = Ok<T> | Fail;
