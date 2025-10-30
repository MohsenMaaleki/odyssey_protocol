# Realtime HUD & Countdown Integration Guide

This document explains how to integrate the realtime HUD and countdown system into your game logic.

## Overview

The realtime system provides:
- **Live HUD updates** for mission statistics (Fuel, Hull, Crew, Success, Science Points)
- **Countdown timers** for time-boxed phases (Launch, Ballot, Phase gates)
- **Graceful degradation** for clients without realtime support
- **Drift correction** to handle clock skew
- **Automatic reconnection** with state synchronization

## Server-Side Integration

### 1. Publishing HUD Updates

When mission stats change, publish updates using the helper functions:

```typescript
import { realtimeService } from './index.js';
import { publishHudUpdate } from './utils/realtimeHelpers.js';

// Example: When fuel decreases
async function consumeFuel(missionId: string, amount: number) {
  // Update game state
  const newFuel = currentFuel - amount;
  await redis.hSet(`mission:${missionId}:state`, { fuel: newFuel.toString() });
  
  // Publish realtime update
  await publishHudUpdate(realtimeService, missionId, { fuel: newFuel });
}
```

### 2. Publishing Phase Transitions

When transitioning between phases, publish a full HUD snapshot:

```typescript
import { publishPhaseTransition } from './utils/realtimeHelpers.js';

// Example: Transitioning to LAUNCH phase
async function startLaunchPhase(missionId: string) {
  // Update phase in state
  await redis.hSet(`mission:${missionId}:state`, { phase: 'LAUNCH' });
  
  // Fetch all current stats
  const state = await redis.hGetAll(`mission:${missionId}:state`);
  
  // Publish full snapshot
  await publishPhaseTransition(realtimeService, missionId, 'LAUNCH', {
    fuel: parseInt(state.fuel || '100'),
    hull: parseInt(state.hull || '100'),
    crew: parseInt(state.crew || '100'),
    success: parseInt(state.success || '50'),
    scienceDelta: parseInt(state.science_points || '0'),
  });
}
```

### 3. Starting Countdown Timers

When entering a timed phase, start a countdown:

```typescript
import { startMissionTimer } from './utils/realtimeHelpers.js';

// Example: Start 30-second launch countdown
async function initiateLaunch(missionId: string) {
  const durationMs = 30000; // 30 seconds
  
  await startMissionTimer(
    realtimeService,
    missionId,
    'LAUNCH',
    durationMs
  );
  
  // The timer will automatically:
  // 1. Store deadline in PostData
  // 2. Create scheduled action
  // 3. Publish timer start message
}
```

### 4. Pausing/Resuming Timers

```typescript
import { pauseMissionTimer, resumeMissionTimer } from './utils/realtimeHelpers.js';

// Pause a timer
async function pauseTimer(missionId: string, remainingMs: number) {
  await pauseMissionTimer(realtimeService, missionId, 'BALLOT', remainingMs);
}

// Resume a timer
async function resumeTimer(missionId: string, remainingMs: number) {
  await resumeMissionTimer(realtimeService, missionId, 'BALLOT', remainingMs);
}
```

### 5. Ending Timers

```typescript
import { endMissionTimer } from './utils/realtimeHelpers.js';

// Manually end a timer
async function cancelTimer(missionId: string) {
  await endMissionTimer(realtimeService, missionId, 'PHASE');
}
```

## Timer Types

Three timer kinds are supported:

- **LAUNCH**: Launch countdown (e.g., "Liftoff in T−03:27")
- **BALLOT**: Voting/ballot countdown (e.g., "Ballot closes in 01:59")
- **PHASE**: Phase gate countdown (e.g., "Decide in 08:41")

## Scheduled Actions

Timers are enforced by scheduled actions that run every minute. When a timer expires:

1. The scheduled action detects the expiration
2. Updates PostData to clear the timer
3. Publishes a timer "ended" message
4. Publishes an authoritative HUD snapshot

The scheduler endpoint is at `/internal/scheduler/process-timers` and runs via cron.

## Client-Side Integration

### Using the HUD Component

```typescript
import { MissionHud } from './components/MissionHud.js';

// In your game component
<MissionHud 
  missionId="mission-001"
  initialState={{
    fuel: 100,
    hull: 100,
    crew: 100,
    success: 50,
    scienceDelta: 0,
    phase: 'DESIGN'
  }}
/>
```

### Using the Timer Panel

```typescript
import { TimerPanel } from './components/TimerPanel.js';

// In your game component
<TimerPanel 
  missionId="mission-001"
  timers={{
    launch_countdown_until: '2024-01-15T10:30:00Z',
    choices_open_until: null,
    phase_gate_until: null
  }}
/>
```

## Mission Initialization

When creating a new mission, initialize the PostData schema:

```typescript
import { initializeMission } from './utils/missionInit.js';

async function createMission(missionId: string) {
  // Initialize mission state and PostData
  await initializeMission(redis, missionId);
  
  // Mission is now ready for realtime updates
}
```

## Testing

### Manual Testing

1. Start the dev server: `npm run dev`
2. Open the playtest URL
3. Click "Show Mission HUD Demo" button
4. Observe the live countdown timer

### Triggering Updates from Server

Use the Devvit CLI or create test endpoints:

```typescript
// Test endpoint (remove in production)
router.post('/api/test/update-hud', async (req, res) => {
  const { missionId } = req.body;
  
  await publishHudUpdate(realtimeService, missionId, {
    fuel: Math.floor(Math.random() * 100),
    hull: Math.floor(Math.random() * 100),
  });
  
  res.json({ success: true });
});
```

## Fallback Mode

If realtime is unavailable:
- Clients automatically poll `/api/mission/snapshot` every 5 seconds
- Timers continue ticking using local time calculations
- Full functionality is maintained

## Performance Considerations

- **Don't publish every second**: Only publish on state changes
- **Batch updates**: Combine multiple stat changes into one message
- **Use full snapshots sparingly**: Only on phase transitions
- **Monitor scheduled actions**: Limit to 10 concurrent per installation

## Troubleshooting

### Timers not starting
- Check that `realtime: true` is in devvit.json
- Verify realtimeService is initialized in server index
- Check console logs for errors

### HUD not updating
- Verify realtime connection in browser console
- Check that messages are being published server-side
- Ensure mission_id matches between client and server

### Drift issues
- Server includes `now` timestamp in timer messages
- Client calculates offset automatically
- Check that server time is accurate

## Example: Complete Launch Sequence

```typescript
async function executeLaunchSequence(missionId: string) {
  // 1. Transition to LAUNCH phase
  await publishPhaseTransition(realtimeService, missionId, 'LAUNCH', {
    fuel: 100, hull: 100, crew: 100, success: 50, scienceDelta: 0
  });
  
  // 2. Start 30-second countdown
  await startMissionTimer(realtimeService, missionId, 'LAUNCH', 30000);
  
  // 3. Wait for countdown to expire (handled by scheduled action)
  // When timer expires, scheduled action will:
  //   - Publish timer "ended" message
  //   - Publish HUD snapshot
  
  // 4. In your game logic, handle the launch
  // (triggered by scheduled action or manual check)
}
```

## API Reference

### Helper Functions

- `publishHudUpdate(service, missionId, hudData, isPhaseTransition?)`
- `publishPhaseTransition(service, missionId, phase, allStats)`
- `startMissionTimer(service, missionId, timerKind, durationMs)`
- `pauseMissionTimer(service, missionId, timerKind, remainingMs)`
- `resumeMissionTimer(service, missionId, timerKind, remainingMs)`
- `endMissionTimer(service, missionId, timerKind)`

### Initialization Functions

- `initializeMission(redis, missionId)` - Complete mission setup
- `initializeMissionState(redis, missionId)` - Initialize state only
- `initializeMissionPostData(redis, missionId)` - Initialize PostData only
- `registerActiveMission(redis, missionId)` - Register for scheduler

## Next Steps

1. Integrate HUD updates into your game logic
2. Add timer starts to phase transitions
3. Test with multiple clients
4. Monitor performance and adjust polling intervals if needed
5. Remove demo components when game is complete
