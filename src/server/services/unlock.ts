/**
 * UnlockService - Core business logic for unlock system
 * Handles Science Points, unlock purchases, and season management
 */

import type { UnlockStatus, PurchaseResult, SeasonResetResult } from '../../shared/types/unlock';
import { UNLOCK_TREE } from '../data/unlockTree';

export class UnlockService {
  constructor(
    private redis: any,
    private reddit: any,
    private context: any
  ) {}

  /**
   * Initialize storage for a new user
   * Sets up Science Points balance and metadata
   */
  async initializeUser(username: string): Promise<void> {
    const spKey = `unlock:${username}:sp`;
    const exists = await this.redis.get(spKey);

    if (!exists) {
      // Initialize Science Points to 0
      await this.redis.set(spKey, '0');

      // Initialize metadata with current season and tree version
      const metaKey = `unlock:${username}:meta`;
      const currentSeason = await this.getCurrentSeason();
      await this.redis.set(
        metaKey,
        JSON.stringify({
          season: currentSeason,
          tree_version: 1,
          purchased_at: {},
        })
      );
    }
  }

  /**
   * Get user's unlock status
   * Fetches Science Points, purchased unlocks, and metadata
   */
  async getUnlockStatus(username: string): Promise<UnlockStatus> {
    const spKey = `unlock:${username}:sp`;
    const purchasedKey = `unlock:${username}:purchased`;
    const metaKey = `unlock:${username}:meta`;

    const [sp, purchasedJson, metaJson] = await Promise.all([
      this.redis.get(spKey),
      this.redis.get(purchasedKey),
      this.redis.get(metaKey),
    ]);

    const purchased: string[] = purchasedJson ? JSON.parse(purchasedJson) : [];

    const meta = metaJson
      ? JSON.parse(metaJson)
      : {
          season: 1,
          tree_version: 1,
          purchased_at: {},
        };

    // Check for season mismatch and reset unlocks if needed
    const currentSeason = await this.getCurrentSeason();
    if (meta.season !== currentSeason) {
      // Season has changed, clear purchased unlocks
      await this.redis.del(purchasedKey);
      meta.season = currentSeason;
      meta.purchased_at = {};
      await this.redis.set(metaKey, JSON.stringify(meta));

      return {
        total_science_points: parseInt(sp || '0', 10),
        unlocks: [],
        unlock_meta: meta,
      };
    }

    return {
      total_science_points: parseInt(sp || '0', 10),
      unlocks: purchased,
      unlock_meta: meta,
    };
  }

  /**
   * Add Science Points to user's balance
   * Uses Redis INCRBY for atomic increment
   */
  async addSciencePoints(username: string, amount: number): Promise<number> {
    const spKey = `unlock:${username}:sp`;
    const newBalance = await this.redis.incrBy(spKey, amount);
    return newBalance;
  }

  /**
   * Get user's Science Points balance
   */
  async getSciencePoints(username: string): Promise<number> {
    const spKey = `unlock:${username}:sp`;
    const sp = await this.redis.get(spKey);
    return parseInt(sp || '0', 10);
  }

  /**
   * Purchase an unlock with atomic transaction
   * Validates prerequisites, SP balance, and executes atomic Redis transaction
   */
  async purchaseUnlock(username: string, unlockId: string): Promise<PurchaseResult> {
    // Validate unlock exists
    const node = this.getUnlockNode(unlockId);
    if (!node) {
      return {
        ok: false,
        message: `Unlock ${unlockId} not found`,
      };
    }

    const spKey = `unlock:${username}:sp`;
    const purchasedKey = `unlock:${username}:purchased`;
    const metaKey = `unlock:${username}:meta`;

    try {
      // Watch the purchased key for transaction (optimistic locking)
      // Note: Devvit redis.watch() only accepts a single key, not an array
      const txn = await this.redis.watch(purchasedKey);

      // Get current state
      const [currentSp, purchasedJson, metaJson] = await Promise.all([
        this.redis.get(spKey),
        this.redis.get(purchasedKey),
        this.redis.get(metaKey),
      ]);

      const purchased: string[] = purchasedJson ? JSON.parse(purchasedJson) : [];

      const sp = parseInt(currentSp || '0', 10);
      const purchasedSet = new Set(purchased || []);
      const meta = metaJson
        ? JSON.parse(metaJson)
        : {
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
      const prereqsMet = node.prereq.every((prereq) => purchasedSet.has(prereq));
      if (!prereqsMet) {
        await txn.unwatch();
        const missingPrereqs = node.prereq.filter((p) => !purchasedSet.has(p));
        return {
          ok: false,
          message: 'Prerequisites not met',
          missing_prereqs: missingPrereqs,
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

      // Execute atomic transaction
      await txn.multi();
      await txn.incrBy(spKey, -node.cost); // Use negative value to decrement
      
      // Add to purchased array
      const updatedPurchased = [...purchased, unlockId];
      await txn.set(purchasedKey, JSON.stringify(updatedPurchased));

      // Update metadata with purchase timestamp
      meta.purchased_at[unlockId] = new Date().toISOString();
      await txn.set(metaKey, JSON.stringify(meta));

      const results = await txn.exec();

      // Check if transaction succeeded
      if (!results) {
        // Transaction failed (key was modified)
        return {
          ok: false,
          message: 'Transaction failed, please try again',
        };
      }

      return {
        ok: true,
        message: `Unlocked ${node.label}`,
        new_sp: sp - node.cost,
        unlock_id: unlockId,
      };
    } catch (error) {
      console.error('Error purchasing unlock:', error);
      return {
        ok: false,
        message: 'Failed to purchase unlock',
      };
    }
  }

  /**
   * Get unlock node by ID from the unlock tree
   * Returns undefined if node not found
   */
  private getUnlockNode(id: string) {
    return UNLOCK_TREE.nodes.find((node) => node.id === id);
  }

  /**
   * Reset unlocks for new season (moderator only)
   * Increments global season number, causing all users to lose unlocks on next access
   */
  async resetSeason(moderatorUsername: string): Promise<SeasonResetResult> {
    // Check moderator permission
    const isMod = await this.checkModeratorPermission(moderatorUsername);
    if (!isMod) {
      return {
        ok: false,
        message: 'Moderator permission required',
      };
    }

    try {
      // Increment global season number
      const newSeason = await this.redis.incrBy('unlock:season', 1);

      // Note: Individual user data is NOT cleared here
      // Users keep their SP but lose unlocks on next access
      // This is handled by season mismatch detection in getUnlockStatus

      return {
        ok: true,
        season: newSeason,
        message: `Season ${newSeason} started`,
      };
    } catch (error) {
      console.error('Error resetting season:', error);
      return {
        ok: false,
        message: 'Failed to reset season',
      };
    }
  }

  /**
   * Check if user has moderator permissions
   * Uses Reddit API to verify moderator status
   */
  private async checkModeratorPermission(username: string): Promise<boolean> {
    try {
      const subredditName = this.context.subredditName;
      if (!subredditName) {
        console.error('Subreddit name not found in context');
        return false;
      }

      const moderators = await this.reddit.getModerators({
        subredditName,
      });

      return moderators.some((mod: any) => mod.username === username);
    } catch (error) {
      console.error('Error checking moderator permission:', error);
      return false;
    }
  }

  /**
   * Get current global season number
   * Returns 1 if no season has been set
   */
  private async getCurrentSeason(): Promise<number> {
    const season = await this.redis.get('unlock:season');
    return parseInt(season || '1', 10);
  }

  /**
   * Compute baseline effects from unlocks for mission start
   * Returns aggregate effects from all purchased unlocks
   */
  async computeBaselineEffects(): Promise<{
    successChance?: number;
    morale?: number;
    scienceBonus?: number;
    fuelCapacity?: number;
  }> {
    // For MVP, return default effects
    // In full implementation, this would read from current user's unlocks
    // and aggregate their effects from the unlock tree
    return {
      successChance: 0,
      morale: 0,
      scienceBonus: 0,
      fuelCapacity: 0,
    };
  }

  /**
   * Add Science Points globally (for mission rewards)
   * This adds to a global pool rather than per-user
   */
  async addSciencePointsGlobal(amount: number): Promise<number> {
    const globalSpKey = 'storage:global:total_science_points';
    const newBalance = await this.redis.incrBy(globalSpKey, amount);
    return newBalance;
  }
}
