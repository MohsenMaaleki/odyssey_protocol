import React from 'react';
import { useRealtimeHud, type HudState } from '../hooks/useRealtimeHud.js';
import { StatBar } from './StatBar.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import './MissionHud.css';

export interface MissionHudProps {
  missionId: string;
  initialState: HudState;
}

/**
 * Main HUD component displaying all mission statistics
 * Subscribes to realtime updates and shows connection status
 */
function MissionHudContent({ missionId, initialState }: MissionHudProps) {
  const { hud, isConnected, lastUpdate } = useRealtimeHud(missionId, initialState);

  return (
    <div className="mission-hud">
      <div className="mission-hud-header">
        <h3 className="mission-hud-title">Mission Status</h3>
        {!isConnected && (
          <div className="mission-hud-status offline">
            <span className="status-indicator">●</span>
            Offline Mode
          </div>
        )}
        {isConnected && (
          <div className="mission-hud-status online">
            <span className="status-indicator">●</span>
            Live
          </div>
        )}
      </div>

      <div className="mission-hud-stats">
        <StatBar label="Fuel" icon="⛽" value={hud.fuel} max={100} />
        <StatBar label="Hull" icon="🛡" value={hud.hull} max={100} />
        <StatBar label="Crew" icon="🙂" value={hud.crew} max={100} />
        <StatBar label="Success" icon="🎯" value={hud.success} max={100} />

        <div className="science-delta">
          <span className="science-icon">🧪</span>
          <span className="science-label">Science Points</span>
          <span className={`science-value ${hud.scienceDelta >= 0 ? 'positive' : 'negative'}`}>
            {hud.scienceDelta >= 0 ? '+' : ''}
            {hud.scienceDelta}
          </span>
        </div>
      </div>

      <div className="mission-hud-phase">
        <span className="phase-label">Phase:</span>
        <span className="phase-value">{hud.phase}</span>
      </div>
    </div>
  );
}

/**
 * Wrapped MissionHud with error boundary
 */
export function MissionHud(props: MissionHudProps) {
  return (
    <ErrorBoundary
      componentName="Mission HUD"
      fallback={
        <div className="mission-hud-error">
          <p>Unable to load mission status</p>
        </div>
      }
    >
      <MissionHudContent {...props} />
    </ErrorBoundary>
  );
}
