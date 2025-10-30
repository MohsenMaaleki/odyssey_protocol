# Design Document

## Overview

The Unlock Tree System provides a persistent progression layer for Odyssey Protocol using Devvit's Storage API (Redis) and Express API endpoints. Players earn Science Points (SP) through gameplay and spend them to unlock missions, ship parts, and bonuses. The system uses atomic Redis transactions to ensure data consistency and integrates with the existing game phases to gate content based on unlock status.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Client (React) │
│  - Tech Tree UI │
│  - SP Display   │
└────────┬────────┘
         │ HTTP/Fetch
         ▼
┌─────────────────────────┐
│  Express Server         │
│  - Unlock Routes        │
│  - Validation Logic     │
│  - Transaction Handling │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  UnlockService          │
│  - Purchase Logic       │
│  - Prerequisite Check   │
│  - SP Management        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Devvit Redis Storage   │
│  - Player Unlocks       │
│  - Science Points       │
│  - Season Metadata      │
└─────────────────────────┘
```

### Storage Architecture

The system uses Redis with the following key structure:

```
unlock:{username}:sp          → Science Points balance (string/number)
unlock:{username}:purchased   → Set of purchased unlock IDs
unlock:{username}:meta        → JSON metadata (season, timestamps)
unlock:season                 → Global season number
unlock:tree_version           → Tree version for migration support
```

## Components and Interfaces

### 1. Unlock Tree Definition (`src/server/data/unlockTree.ts`)

Static definition of all available unlocks:

```typescript
export interface UnlockNode {
  id: string;
  type: 'part' | 'mission' | 'bonus';
  cost: number;
  label: string;
  description?: string;
  prereq: string[];
  effect?: {
    successChance?: number;
    morale?: number;
    maxFuel?: number;
    scienceBonus?: number;
  };
}

export interface UnlockTree {
  nodes: UnlockNode[];
  edges: [string, string][]; // [from, to] relationships
}

export const UNLOCK_TREE: UnlockTree = {
  nodes: [
    {
      id: 'engine_light',
      type: 'part',
      cost: 5,
      label: 'Light Engine',
      description: 'Basic propulsion system',
      prereq: [],
      effect: { successChance: 3 },
    },
    {
      id: 'engine_heavy',
      type: 'part',
      cost: 12,
      label: 'Heavy Engine',
      description: 'Powerful but affects crew morale',
      prereq: ['engine_light'],
      effect: { successChance: 6, morale: -2 },
    },
    // ... more nodes
  ],
  edges: [
    ['engine_light', 'engine_heavy'],
    ['mission_moon', 'mission_mars'],
  ],
};
```

### 2. Unlock Service (`src/server/services/unlock.ts`)

Core business logic for unlock operations:

```typescript
export class UnlockService {
  constructor(
    private redis: any,
    private reddit: any,
    private context: any
  ) {}

  /**
   * Initialize storage for a new user
   */
  async initializeUser(username: string): Promise<void> {
    const spKey = `unlock:${username}:sp`;
    const exists = await this.redis.get(spKey);
    
    if (!exists) {
      await this.redis.set(spKey, '0');
      // Initialize empty purchased set
      const metaKey = `unlock:${username}:meta`;
      await this.redis.set(metaKey, JSON.stringify({
        season: await this.getCurrentSeason(),
        tree_version: 1,
        purchased_at: {},
      }));
    }
  }

  /**
   * Get user's unlock status
   */
  async getUnlockStatus(username: string): Promise<UnlockStatus> {
    const spKey = `unlock:${username}:sp`;
    const purchasedKey = `unlock:${username}:purchased`;
    const metaKey = `unlock:${username}:meta`;

    const [sp, purchased, metaJson] = await Promise.all([
      this.redis.get(spKey),
      this.redis.sMembers(purchasedKey),
      this.redis.get(metaKey),
    ]);

    const meta = metaJson ? JSON.parse(metaJson) : {
      season: 1,
      tree_version: 1,
      purchased_at: {},
    };

    return {
      total_science_points: parseInt(sp || '0', 10),
      unlocks: purchased || [],
      unlock_meta: meta,
    };
  }

  /**
   * Purchase an unlock with atomic transaction
   */
  async purchaseUnlock(
    username: string,
    unlockId: string
  ): Promise<PurchaseResult> {
    // Validate unlock exists
    const node = this.getUnlockNode(unlockId);
    if (!node) {
      return {
        ok: false,
        message: `Unlock ${unlockId} not found`,
      };
    }

    // Use Redis transaction for atomic operation
    const spKey = `unlock:${username}:sp`;
    const purchasedKey = `unlock:${username}:purchased`;
    const metaKey = `unlock:${username}:meta`;

    // Watch keys for transaction
    const txn = await this.redis.watch(spKey, purchasedKey, metaKey);

    try {
      // Get current state
      const [currentSp, purchased, metaJson] = await Promise.all([
        this.redis.get(spKey),
        this.redis.sMembers(purchasedKey),
        this.redis.get(metaKey),
      ]);

      const sp = parseInt(currentSp || '0', 10);
      const purchasedSet = new Set(purchased || []);
      const meta = metaJson ? JSON.parse(metaJson) : {
        season: 1,
        tree_version: 1,
        purchased_at: {},
      };

      // Check if already purchased
      if (purchasedSet.has(unlockId)) {
        await txn.unwatch();
        return {
          ok: false,
          message: 'Unlock already purchased',
        };
      }

      // Check prerequisites
      const prereqsMet = node.prereq.every((prereq) =>
        purchasedSet.has(prereq)
      );
      if (!prereqsMet) {
        await txn.unwatch();
        return {
          ok: false,
          message: 'Prerequisites not met',
          missing_prereqs: node.prereq.filter((p) => !purchasedSet.has(p)),
        };
      }

      // Check sufficient SP
      if (sp < node.cost) {
        await txn.unwatch();
        return {
          ok: false,
          message: 'Insufficient Science Points',
          required: node.cost,
          available: sp,
        };
      }

      // Execute transaction
      await txn.multi();
      await txn.decrBy(spKey, node.cost);
      await txn.sAdd(purchasedKey, unlockId);
      
      // Update metadata
      meta.purchased_at[unlockId] = new Date().toISOString();
      await txn.set(metaKey, JSON.stringify(meta));
      
      await txn.exec();

      return {
        ok: true,
        message: `Unlocked ${node.label}`,
        new_sp: sp - node.cost,
        unlock_id: unlockId,
      };
    } catch (error) {
      await txn.discard();
      throw error;
    }
  }

  /**
   * Add Science Points to user
   */
  async addSciencePoints(
    username: string,
    amount: number
  ): Promise<number> {
    const spKey = `unlock:${username}:sp`;
    return await this.redis.incrBy(spKey, amount);
  }

  /**
   * Get unlock node by ID
   */
  private getUnlockNode(id: string): UnlockNode | undefined {
    return UNLOCK_TREE.nodes.find((node) => node.id === id);
  }

  /**
   * Get current global season
   */
  private async getCurrentSeason(): Promise<number> {
    const season = await this.redis.get('unlock:season');
    return parseInt(season || '1', 10);
  }

  /**
   * Reset unlocks for new season (moderator only)
   */
  async resetSeason(
    moderatorUsername: string
  ): Promise<SeasonResetResult> {
    // Check moderator permission
    const isMod = await this.checkModeratorPermission(moderatorUsername);
    if (!isMod) {
      return {
        ok: false,
        message: 'Moderator permission required',
      };
    }

    // Increment season
    const newSeason = await this.redis.incrBy('unlock:season', 1);

    // Note: Individual user data is NOT cleared here
    // Users keep their SP but lose unlocks on next access
    // This is handled by checking season mismatch in getUnlockStatus

    return {
      ok: true,
      season: newSeason,
      message: `Season ${newSeason} started`,
    };
  }

  /**
   * Check if user is moderator
   */
  private async checkModeratorPermission(
    username: string
  ): Promise<boolean> {
    try {
      const subredditName = this.context.subredditName;
      if (!subredditName) return false;

      const moderators = await this.reddit.getModerators({
        subredditName,
      });

      return moderators.some((mod: any) => mod.username === username);
    } catch (error) {
      console.error('Error checking moderator permission:', error);
      return false;
    }
  }
}
```

### 3. API Routes (`src/server/routes/unlock.ts`)

Express routes for unlock operations:

```typescript
import express from 'express';
import { UnlockService } from '../services/unlock';
import { UNLOCK_TREE } from '../data/unlockTree';

const router = express.Router();

/**
 * GET /api/unlocks/tree
 * Returns the complete unlock tree and user's status
 */
router.get('/api/unlocks/tree', async (req, res) => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const service = new UnlockService(redis, reddit, context);
    await service.initializeUser(username);
    
    const status = await service.getUnlockStatus(username);

    res.json({
      tree: UNLOCK_TREE,
      status,
    });
  } catch (error) {
    console.error('Error fetching unlock tree:', error);
    res.status(500).json({ error: 'Failed to fetch unlock tree' });
  }
});

/**
 * GET /api/unlocks/status
 * Returns user's unlock status only
 */
router.get('/api/unlocks/status', async (req, res) => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const service = new UnlockService(redis, reddit, context);
    const status = await service.getUnlockStatus(username);

    res.json(status);
  } catch (error) {
    console.error('Error fetching unlock status:', error);
    res.status(500).json({ error: 'Failed to fetch unlock status' });
  }
});

/**
 * POST /api/unlocks/purchase
 * Purchase an unlock
 */
router.post('/api/unlocks/purchase', async (req, res) => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Unlock ID required' });
    }

    const service = new UnlockService(redis, reddit, context);
    const result = await service.purchaseUnlock(username, id);

    if (!result.ok) {
      // Determine appropriate status code
      if (result.message?.includes('Insufficient')) {
        return res.status(402).json(result);
      }
      if (result.message?.includes('Prerequisites')) {
        return res.status(409).json(result);
      }
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error purchasing unlock:', error);
    res.status(500).json({ error: 'Failed to purchase unlock' });
  }
});

/**
 * POST /api/unlocks/reset
 * Reset season (moderator only)
 */
router.post('/api/unlocks/reset', async (req, res) => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const service = new UnlockService(redis, reddit, context);
    const result = await service.resetSeason(username);

    if (!result.ok) {
      return res.status(403).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error resetting season:', error);
    res.status(500).json({ error: 'Failed to reset season' });
  }
});

export default router;
```

## Data Models

### TypeScript Interfaces (`src/shared/types/unlock.ts`)

```typescript
export interface UnlockNode {
  id: string;
  type: 'part' | 'mission' | 'bonus';
  cost: number;
  label: string;
  description?: string;
  prereq: string[];
  effect?: UnlockEffect;
}

export interface UnlockEffect {
  successChance?: number;
  morale?: number;
  maxFuel?: number;
  scienceBonus?: number;
}

export interface UnlockTree {
  nodes: UnlockNode[];
  edges: [string, string][];
}

export interface UnlockStatus {
  total_science_points: number;
  unlocks: string[];
  unlock_meta: {
    season: number;
    tree_version: number;
    purchased_at: Record<string, string>;
  };
}

export interface PurchaseResult {
  ok: boolean;
  message: string;
  new_sp?: number;
  unlock_id?: string;
  required?: number;
  available?: number;
  missing_prereqs?: string[];
}

export interface SeasonResetResult {
  ok: boolean;
  season?: number;
  message: string;
}

// API Request/Response Types
export interface PurchaseUnlockRequest {
  id: string;
}

export interface GetTreeResponse {
  tree: UnlockTree;
  status: UnlockStatus;
}
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```typescript
{
  ok: false,
  message: string,
  // Additional context fields as needed
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid unlock ID, already purchased)
- `401` - Unauthorized (not authenticated)
- `402` - Payment Required (insufficient SP)
- `403` - Forbidden (not a moderator)
- `409` - Conflict (prerequisites not met)
- `500` - Internal Server Error

### Transaction Error Handling

Redis transactions use optimistic locking with `watch`:

1. Watch relevant keys
2. Read current state
3. Validate operation
4. Execute multi/exec transaction
5. If transaction fails (key modified), retry or return error

## Testing Strategy

### Unit Tests

Test individual service methods:

- `UnlockService.purchaseUnlock()` - various scenarios
- `UnlockService.getUnlockStatus()` - data retrieval
- `UnlockService.addSciencePoints()` - SP management
- Prerequisite validation logic
- Moderator permission checks

### Integration Tests

Test complete flows:

1. **Purchase Flow**
   - User purchases unlock with sufficient SP
   - Verify SP deducted
   - Verify unlock added to purchased list
   - Verify timestamp recorded

2. **Prerequisite Validation**
   - Attempt purchase without prerequisites
   - Verify rejection with correct error

3. **Insufficient SP**
   - Attempt purchase with insufficient SP
   - Verify rejection with 402 status

4. **Concurrent Purchases**
   - Simulate concurrent purchase attempts
   - Verify only one succeeds
   - Verify SP balance is correct

5. **Season Reset**
   - Moderator resets season
   - Verify season incremented
   - Verify user unlocks cleared on next access

### API Tests

Test HTTP endpoints:

- GET `/api/unlocks/tree` - returns tree and status
- GET `/api/unlocks/status` - returns user status
- POST `/api/unlocks/purchase` - successful purchase
- POST `/api/unlocks/purchase` - various error cases
- POST `/api/unlocks/reset` - moderator only

### Client Integration Tests

Test UI integration:

- Tech tree modal displays correctly
- Purchase button triggers API call
- SP display updates after purchase
- Locked items disabled in design phase
- Locked missions hidden in mission selection

## Performance Considerations

### Caching Strategy

- Unlock tree definition is static and can be cached in memory
- User unlock status should be fetched on demand
- Consider caching user status in client for session duration

### Redis Optimization

- Use Redis Sets for purchased unlocks (O(1) membership check)
- Use atomic operations (INCRBY, SADD) for consistency
- Batch operations where possible (MGET for multiple keys)

### Transaction Efficiency

- Keep transactions short and focused
- Only watch keys that will be modified
- Unwatch keys if validation fails before transaction

## Security Considerations

### Authentication

- All endpoints require authenticated Reddit user
- Username obtained from `reddit.getCurrentUsername()`
- No client-provided username accepted

### Authorization

- Season reset requires moderator permission
- Moderator check uses Reddit API
- Failed permission checks return 403

### Data Validation

- Validate unlock ID against static tree
- Validate SP amounts are non-negative
- Sanitize all user inputs
- Use TypeScript for type safety

### Race Condition Prevention

- Use Redis transactions with WATCH for atomic operations
- Handle transaction failures gracefully
- Retry logic for transient failures

## Deployment Considerations

### Devvit Configuration

Update `devvit.json` to include required capabilities:

```json
{
  "capabilities": {
    "redis": true,
    "http": true
  }
}
```

### Migration Strategy

If unlock tree changes:

1. Increment `tree_version` in storage
2. Check version on user access
3. Migrate user data if needed
4. Handle deprecated unlocks gracefully

### Monitoring

Log key events:

- Unlock purchases
- Season resets
- Transaction failures
- Permission check failures
- API errors

## Future Enhancements

### Realtime Updates

Use Devvit Realtime API to push SP updates to clients:

```typescript
// Server-side
await context.realtime.send('sp_update', {
  username,
  new_sp: updatedSp,
});

// Client-side
context.realtime.on('sp_update', (data) => {
  updateSPDisplay(data.new_sp);
});
```

### Scheduled Unlocks

Use Devvit Scheduled Actions for timed events:

```typescript
// Weekly SP bonus
Devvit.addScheduledAction({
  name: 'weekly_sp_bonus',
  cron: '0 0 * * 0', // Every Sunday
  handler: async (context) => {
    // Award bonus SP to active players
  },
});
```

### Forms Integration

Use Devvit Forms for voting on unlock priorities:

```typescript
Devvit.addForm({
  name: 'vote_unlock',
  fields: [
    {
      name: 'unlock_id',
      type: 'select',
      options: UNLOCK_TREE.nodes.map(n => ({
        label: n.label,
        value: n.id,
      })),
    },
  ],
  handler: async (context, values) => {
    // Record vote
  },
});
```
