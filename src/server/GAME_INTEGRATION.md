# Game Integration Guide

This guide explains how to integrate the leaderboard system with your game logic.

## Server-Side Integration

### 1. Initialize GameService

In your game route or handler, create a GameService instance:

```typescript
import { LeaderboardService } from './services/leaderboard';
import { GameService } from './services/game';
import { redis, reddit, context } from '@devvit/web/server';

// Initialize services
const leaderboardService = new LeaderboardService(redis, reddit, context);
const gameService = new GameService(leaderboardService, redis);
```

### 2. Track Participants

Whenever a user performs any valid action during a mission, record them as a participant:

```typescript
// In your action validation handler
async function handleUserAction(missionId: string, username: string, action: any) {
  // Validate the action...

  // Record participant
  await gameService.recordParticipant(missionId, username);

  // Continue with game logic...
}
```

### 3. Award Points for Decisive Actions

When a user action triggers a phase transition:

```typescript
// In your phase transition handler
async function handlePhaseTransition(missionId: string, username: string, newPhase: string) {
  // Perform phase transition...

  // Award points for decisive action
  const awarded = await gameService.handleDecisiveAction(missionId, username);

  // Return success with point award info
  return {
    success: true,
    newPhase,
    pointsAwarded: awarded,
  };
}
```

### 4. Award Points for Mission Completion

When a mission reaches the RESULT phase:

```typescript
// In your mission result handler
async function handleMissionResult(missionId: string, outcome: 'success' | 'fail' | 'abort') {
  // Determine mission outcome...

  // Award points to all participants
  const result = await gameService.handleMissionCompletion(missionId, outcome);

  console.log(`Credited ${result.credited} participants for mission ${missionId}`);

  // Continue with result phase logic...
}
```

### 5. Optional: Award Vote Participation Points

If you want to award micro-points for any valid action:

```typescript
// In your action validation handler
async function handleUserAction(missionId: string, username: string, action: any) {
  // Validate action...

  // Record participant
  await gameService.recordParticipant(missionId, username);

  // Award participation point (idempotency ensures once per mission)
  await gameService.handleVoteParticipation(missionId, username);

  // Continue with game logic...
}
```

## Client-Side Integration

### 1. Use Toast Hook

In your game component, use the `useToast` hook:

```typescript
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import { showPointAwardToast } from './utils/pointNotifications';

function GameComponent() {
  const { toasts, showToast, hideToast } = useToast();

  // Your game logic...

  return (
    <div>
      <ToastContainer toasts={toasts} onClose={hideToast} />
      {/* Your game UI */}
    </div>
  );
}
```

### 2. Show Toast After Server Confirms Points

When making an API call that awards points, show a toast after success:

```typescript
import { showPointAwardToast } from './utils/pointNotifications';

async function performDecisiveAction(missionId: string, action: any) {
  try {
    const response = await fetch('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, action }),
    });

    const data = await response.json();

    if (data.success && data.pointsAwarded) {
      // Show toast notification for point award
      showPointAwardToast(showToast, 'ACTION_DECISIVE');
    }

    return data;
  } catch (error) {
    console.error('Action failed:', error);
    showToast('Action failed', 'error');
  }
}
```

### 3. Show Toast for Mission Completion

When a mission completes, you can show a toast for all participants:

```typescript
async function completeMission(missionId: string, outcome: 'success' | 'fail' | 'abort') {
  try {
    const response = await fetch('/api/game/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId, outcome }),
    });

    const data = await response.json();

    if (data.success) {
      // Show appropriate toast based on outcome
      const reason =
        outcome === 'success'
          ? 'MISSION_SUCCESS'
          : outcome === 'fail'
            ? 'MISSION_FAIL'
            : 'MISSION_ABORT';

      showPointAwardToast(showToast, reason);
    }

    return data;
  } catch (error) {
    console.error('Mission completion failed:', error);
  }
}
```

## Example API Endpoints

Here's an example of how to create game API endpoints that integrate with the leaderboard:

```typescript
// In src/server/routes/game.ts
import express from 'express';
import { redis, reddit, context } from '@devvit/web/server';
import { LeaderboardService } from '../services/leaderboard';
import { GameService } from '../services/game';

const router = express.Router();

// Initialize services
const leaderboardService = new LeaderboardService(redis, reddit, context);
const gameService = new GameService(leaderboardService, redis);

// Handle game action
router.post('/api/game/action', async (req, res) => {
  try {
    const { missionId, action } = req.body;
    const username = await reddit.getCurrentUsername();

    if (!username) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Validate action and determine if it's decisive
    const isDecisive = validateAndProcessAction(missionId, action);

    // Record participant
    await gameService.recordParticipant(missionId, username);

    // Award points if decisive
    let pointsAwarded = false;
    if (isDecisive) {
      pointsAwarded = await gameService.handleDecisiveAction(missionId, username);
    }

    // Optional: Award participation points
    await gameService.handleVoteParticipation(missionId, username);

    res.json({
      success: true,
      pointsAwarded,
      // ... other game state
    });
  } catch (error) {
    console.error('Game action error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

// Handle mission completion
router.post('/api/game/complete', async (req, res) => {
  try {
    const { missionId, outcome } = req.body;

    // Validate outcome
    if (!['success', 'fail', 'abort'].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'Invalid outcome' });
    }

    // Award points to all participants
    const result = await gameService.handleMissionCompletion(missionId, outcome);

    res.json({
      success: true,
      credited: result.credited,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error('Mission completion error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

export default router;
```

## Important Notes

1. **Server-Side Only**: All point awards happen server-side. Never calculate or award points on the client.

2. **Error Handling**: The GameService methods log errors but don't throw exceptions, so game flow isn't blocked by leaderboard issues.

3. **Idempotency**: The leaderboard system ensures each action only awards points once per user per mission.

4. **Toast Timing**: Only show toast notifications after the server confirms the point award.

5. **Participant Tracking**: Always call `recordParticipant()` before awarding any points to ensure users are tracked for mission completion rewards.

## Testing

To test the integration:

1. Start the dev server: `npm run dev`
2. Perform actions in your game
3. Check the console logs for point award confirmations
4. Open the leaderboard modal to verify points were credited
5. Verify toast notifications appear after actions
