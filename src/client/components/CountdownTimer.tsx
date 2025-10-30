import React from 'react';
import { useRealtimeTimer } from '../hooks/useRealtimeTimer.js';
import type { TimerKind } from '../../shared/types/realtime.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import './CountdownTimer.css';

export interface CountdownTimerProps {
  missionId: string;
  timerKind: TimerKind;
  label: string;
  fallbackEndsAt?: string | null;
}

/**
 * Countdown timer component with color-coded states
 * Shows T−mm:ss format with warning/danger states
 */
function CountdownTimerContent({
  missionId,
  timerKind,
  label,
  fallbackEndsAt,
}: CountdownTimerProps) {
  const { timer, isConnected, remainingSeconds } = useRealtimeTimer(
    missionId,
    timerKind,
    fallbackEndsAt
  );

  // Format time as T−mm:ss
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `T−${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get color class based on remaining time
  const getColorClass = (): string => {
    if (remainingSeconds <= 10) return 'danger blink';
    if (remainingSeconds <= 60) return 'warning';
    return 'neutral';
  };

  // Don't render if timer has ended
  if (timer.status === 'ended' && timer.remainingMs === 0) {
    return null;
  }

  return (
    <div className={`countdown-timer ${getColorClass()}`}>
      <div className="countdown-header">
        <span className="countdown-label">{label}</span>
        {!isConnected && <span className="countdown-offline">⚠</span>}
      </div>
      <div className="countdown-display">
        <span className="countdown-value">{formatTime(timer.remainingMs)}</span>
        {timer.status === 'paused' && <span className="countdown-paused">⏸</span>}
      </div>
    </div>
  );
}

/**
 * Wrapped CountdownTimer with error boundary
 */
export function CountdownTimer(props: CountdownTimerProps) {
  return (
    <ErrorBoundary
      componentName={`${props.label} Timer`}
      fallback={null} // Silently fail for timers
    >
      <CountdownTimerContent {...props} />
    </ErrorBoundary>
  );
}
