import React from 'react';
import { CountdownTimer } from './CountdownTimer.js';
import type { MissionTimers } from '../../shared/types/mission.js';
import './TimerPanel.css';

export interface TimerPanelProps {
  missionId: string;
  timers: MissionTimers;
}

/**
 * Panel displaying multiple concurrent countdown timers
 * Shows launch, ballot, and phase gate timers with distinct labels
 */
export function TimerPanel({ missionId, timers }: TimerPanelProps) {
  const hasActiveTimers =
    timers.launch_countdown_until || timers.choices_open_until || timers.phase_gate_until;

  if (!hasActiveTimers) {
    return null;
  }

  return (
    <div className="timer-panel">
      <h4 className="timer-panel-title">Active Countdowns</h4>

      {timers.launch_countdown_until && (
        <CountdownTimer
          missionId={missionId}
          timerKind="LAUNCH"
          label="🚀 Liftoff in"
          fallbackEndsAt={timers.launch_countdown_until}
        />
      )}

      {timers.choices_open_until && (
        <CountdownTimer
          missionId={missionId}
          timerKind="BALLOT"
          label="🗳️ Ballot closes in"
          fallbackEndsAt={timers.choices_open_until}
        />
      )}

      {timers.phase_gate_until && (
        <CountdownTimer
          missionId={missionId}
          timerKind="PHASE"
          label="⏱️ Phase ends in"
          fallbackEndsAt={timers.phase_gate_until}
        />
      )}
    </div>
  );
}
