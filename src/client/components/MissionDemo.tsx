import React, { useState } from 'react';
import { MissionHud } from './MissionHud.js';
import { TimerPanel } from './TimerPanel.js';
import type { HudState } from '../hooks/useRealtimeHud.js';
import type { MissionTimers } from '../../shared/types/mission.js';
import './MissionDemo.css';

/**
 * Demo component showing HUD and Timer integration
 * Replace this with actual game UI when implemented
 */
export function MissionDemo() {
  const [isVisible, setIsVisible] = useState(false);

  // Mock mission data - replace with actual game state
  const missionId = 'demo-mission-001';

  const initialHudState: HudState = {
    fuel: 85,
    hull: 92,
    crew: 78,
    success: 65,
    scienceDelta: 12,
    phase: 'LAUNCH',
  };

  // Mock timer data - replace with actual PostData
  const mockTimers: MissionTimers = {
    launch_countdown_until: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
    choices_open_until: null,
    phase_gate_until: null,
  };

  return (
    <div className="mission-demo">
      <button className="mission-demo-toggle" onClick={() => setIsVisible(!isVisible)}>
        {isVisible ? '🎮 Hide' : '🎮 Show'} Mission HUD Demo
      </button>

      {isVisible && (
        <div className="mission-demo-container">
          <div className="mission-demo-panels">
            <MissionHud missionId={missionId} initialState={initialHudState} />
            <TimerPanel missionId={missionId} timers={mockTimers} />
          </div>

          <div className="mission-demo-info">
            <p className="mission-demo-note">
              ℹ️ This is a demo of the realtime HUD and countdown system. In the actual game, these
              components will be integrated into the mission UI and receive live updates from the
              server.
            </p>
            <p className="mission-demo-note">
              To test realtime updates, use the helper functions in{' '}
              <code>src/server/utils/realtimeHelpers.ts</code> from your game logic.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
