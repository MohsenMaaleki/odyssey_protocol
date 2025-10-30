// Base message structure for all realtime messages
export interface BaseRealtimeMessage {
  mission_id: string;
  ts: number; // Server epoch milliseconds
}

// HUD statistics data
export interface HudData {
  fuel?: number;
  hull?: number;
  crew?: number;
  success?: number;
  scienceDelta?: number;
  phase?: string;
}

// HUD update message
export interface HudMessage extends BaseRealtimeMessage {
  t: 'hud';
  hud: HudData;
  full?: boolean; // If true, treat as authoritative snapshot
}

// Timer kinds
export type TimerKind = 'LAUNCH' | 'BALLOT' | 'PHASE';

// Timer status
export type TimerStatus = 'running' | 'paused' | 'ended';

// Timer state
export interface TimerData {
  kind: TimerKind;
  ends_at: string; // ISO 8601
  now?: string; // Server time for drift correction
  status: TimerStatus;
}

// Timer state message
export interface TimerMessage extends BaseRealtimeMessage {
  t: 'timer';
  timer: TimerData;
}

// Toast severity levels
export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

// Toast notification message (optional)
export interface ToastMessage extends BaseRealtimeMessage {
  t: 'toast';
  message: string;
  severity: ToastSeverity;
}

// Union type for all realtime messages
export type RealtimeMessage = HudMessage | TimerMessage | ToastMessage;
