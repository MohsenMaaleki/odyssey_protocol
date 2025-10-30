import { describe, it, expect, beforeEach } from 'vitest';
import { LeaderboardService } from './leaderboard';

/**
 * Integration tests for LeaderboardService
 * Tests end-to-end flows, concurrent operations, season resets, and moderator operations
 */

// Mock Redis implementation for testing
class MockRedis {
  private storage: Map<string, any> = new Map();
  private hashStorage: Map<string, Map<string, string>> = new Map();

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.storage.delete(key);
    this.hashStorage.delete(key);
  }

  async hGetAll(key: string): Promise<Record<string, string> | null> {
    const hash = this.hashStorage.get(key);
    if (!hash || hash.size === 0) {
      return null;
    }
    return Object.fromEntries(hash);
  }

  async hSet(key: string, field: string, value: string): Promise<void> {
    if (!this.hashStorage.has(key)) {
      this.hashStorage.set(key, new Map());
    }
    this.hashStorage.get(key)!.set(field, value);
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<number> {
    if (!this.hashStorage.has(key)) {
      this.hashStorage.set(key, new Map());
    }
    const hash = this.hashStorage.get(key)!;
    const currentValue = parseInt(hash.get(field) || '0', 10);
    const newValue = currentValue + increment;
    hash.set(field, newValue.toString());
    return newValue;
  }

  clear(): void {
    this.storage.clear();
    this.hashStorage.clear();
  }
}

// Mock Reddit API
class MockReddit {
  private moderators: string[] = [];

  setModerators(mods: string[]): void {
    this.moderators = mods;
  }

  async getModerators(): Promise<Array<{ username: string }>> {
    return this.moderators.map((username) => ({ username }));
  }
}

describe('LeaderboardService Integration Tests', () => {
  let redis: MockRedis;
  let reddit: MockReddit;
  let context: any;
  let service: LeaderboardService;

  beforeEach(async () => {
    redis = new MockRedis();
    reddit = new MockReddit();
    context = { subredditName: 'test_subreddit' };
    service = new LeaderboardService(redis, reddit, context);

    // Initialize storage
    await service.initializeStorage();
  });

  describe('7.1 End-to-End Credit Flow', () => {
    it('should award points correctly for decisive action', async () => {
      // Test decisive action awards points correctly
      const result = await service.creditPoints('mission-001', 'user_alice', 'ACTION_DECISIVE');

      expect(result.ok).toBe(true);
      expect(result.newTotal).toBe(3); // Default ACTION_DECISIVE points
      expect(result.message).toContain('Credited 3 points');

      // Verify points in leaderboard
      const personalRank = await service.getPersonalRank('user_alice');
      expect(personalRank.points).toBe(3);
      expect(personalRank.rank).toBe(1);
    });

    it('should award points to all participants for mission success', async () => {
      // Test mission success awards points to all participants
      const participants = ['user_alice', 'user_bob', 'user_charlie'];
      const result = await service.bulkCreditPoints('mission-002', participants, 'MISSION_SUCCESS');

      expect(result.ok).toBe(true);
      expect(result.updated).toBe(3);
      expect(result.skipped).toHaveLength(0);

      // Verify all participants received points
      for (const username of participants) {
        const personalRank = await service.getPersonalRank(username);
        expect(personalRank.points).toBe(5); // Default MISSION_SUCCESS points
      }
    });

    it('should not award duplicate points for the same action', async () => {
      // Test duplicate action does not award duplicate points
      const missionId = 'mission-003';
      const username = 'user_dave';
      const reason = 'ACTION_DECISIVE';

      // First credit
      const result1 = await service.creditPoints(missionId, username, reason);
      expect(result1.ok).toBe(true);
      expect(result1.newTotal).toBe(3);

      // Duplicate credit attempt
      const result2 = await service.creditPoints(missionId, username, reason);
      expect(result2.ok).toBe(true);
      expect(result2.newTotal).toBe(3); // Same total, not incremented
      expect(result2.message).toBe('Credit already applied');

      // Verify final points
      const personalRank = await service.getPersonalRank(username);
      expect(personalRank.points).toBe(3); // Only credited once
    });

    it('should allow same user to earn points for different reasons in same mission', async () => {
      const missionId = 'mission-004';
      const username = 'user_eve';

      // Credit for decisive action
      const result1 = await service.creditPoints(missionId, username, 'ACTION_DECISIVE');
      expect(result1.ok).toBe(true);
      expect(result1.newTotal).toBe(3);

      // Credit for mission success (different reason)
      const result2 = await service.creditPoints(missionId, username, 'MISSION_SUCCESS');
      expect(result2.ok).toBe(true);
      expect(result2.newTotal).toBe(8); // 3 + 5

      // Verify final points
      const personalRank = await service.getPersonalRank(username);
      expect(personalRank.points).toBe(8);
    });
  });

  describe('7.2 Concurrent Credit Operations', () => {
    it('should handle multiple users credited simultaneously', async () => {
      // Test multiple users credited simultaneously
      const missionId = 'mission-005';
      const users = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];

      // Credit all users concurrently
      const promises = users.map((username) =>
        service.creditPoints(missionId, username, 'MISSION_SUCCESS')
      );

      const results = await Promise.all(promises);

      // Verify all credits succeeded
      results.forEach((result) => {
        expect(result.ok).toBe(true);
        expect(result.newTotal).toBe(5);
      });

      // Verify all users have correct points
      for (const username of users) {
        const personalRank = await service.getPersonalRank(username);
        expect(personalRank.points).toBe(5);
      }
    });

    it('should handle same user credited from multiple sources', async () => {
      // Test same user credited from multiple sources (different missions)
      const username = 'user_frank';
      const missions = ['mission-006', 'mission-007', 'mission-008'];

      // Credit same user from different missions concurrently
      const promises = missions.map((missionId) =>
        service.creditPoints(missionId, username, 'ACTION_DECISIVE')
      );

      const results = await Promise.all(promises);

      // Verify all credits succeeded
      results.forEach((result, index) => {
        expect(result.ok).toBe(true);
        expect(result.newTotal).toBe((index + 1) * 3); // 3, 6, 9
      });

      // Verify final point total is correct
      const personalRank = await service.getPersonalRank(username);
      expect(personalRank.points).toBe(9); // 3 points × 3 missions
    });

    it('should maintain correct totals with mixed concurrent operations', async () => {
      // Test concurrent operations with different users and reasons
      const operations = [
        { mission: 'mission-009', user: 'user_g', reason: 'ACTION_DECISIVE' as const },
        { mission: 'mission-009', user: 'user_h', reason: 'ACTION_DECISIVE' as const },
        { mission: 'mission-009', user: 'user_g', reason: 'MISSION_SUCCESS' as const },
        { mission: 'mission-010', user: 'user_g', reason: 'ACTION_DECISIVE' as const },
        { mission: 'mission-009', user: 'user_i', reason: 'VOTE_PARTICIPATION' as const },
      ];

      // Execute all operations concurrently
      const promises = operations.map((op) =>
        service.creditPoints(op.mission, op.user, op.reason)
      );

      await Promise.all(promises);

      // Verify final point totals
      const rankG = await service.getPersonalRank('user_g');
      expect(rankG.points).toBe(11); // 3 (decisive) + 5 (success) + 3 (decisive from mission-010)

      const rankH = await service.getPersonalRank('user_h');
      expect(rankH.points).toBe(3); // 3 (decisive)

      const rankI = await service.getPersonalRank('user_i');
      expect(rankI.points).toBe(1); // 1 (vote participation)
    });
  });

  describe('7.3 Season Reset Workflow', () => {
    it('should clear all points when season is reset', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Award points to multiple users
      await service.creditPoints('mission-011', 'user_j', 'ACTION_DECISIVE');
      await service.creditPoints('mission-011', 'user_k', 'MISSION_SUCCESS');
      await service.creditPoints('mission-011', 'user_l', 'MISSION_FAIL');

      // Verify points exist
      const rankJ = await service.getPersonalRank('user_j');
      expect(rankJ.points).toBe(3);

      // Reset season
      const resetResult = await service.resetSeason('mod_user');
      expect(resetResult.ok).toBe(true);
      expect(resetResult.season).toBe(2);

      // Verify all points are cleared
      const rankJAfter = await service.getPersonalRank('user_j');
      expect(rankJAfter.points).toBe(0);
      expect(rankJAfter.rank).toBeNull();

      const rankKAfter = await service.getPersonalRank('user_k');
      expect(rankKAfter.points).toBe(0);

      const rankLAfter = await service.getPersonalRank('user_l');
      expect(rankLAfter.points).toBe(0);
    });

    it('should allow new credits to go to new season after reset', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Award points in season 1
      await service.creditPoints('mission-012', 'user_m', 'ACTION_DECISIVE');
      const rankBefore = await service.getPersonalRank('user_m');
      expect(rankBefore.points).toBe(3);

      // Reset season
      await service.resetSeason('mod_user');

      // Award points in season 2
      const result = await service.creditPoints('mission-013', 'user_m', 'MISSION_SUCCESS');
      expect(result.ok).toBe(true);
      expect(result.newTotal).toBe(5); // New points in new season

      // Verify points in new season
      const rankAfter = await service.getPersonalRank('user_m');
      expect(rankAfter.points).toBe(5);
      expect(rankAfter.rank).toBe(1);
    });

    it('should increment season number correctly', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Get initial season
      const meta1 = await service.getMetadata();
      expect(meta1.season).toBe(1);

      // Reset season
      const reset1 = await service.resetSeason('mod_user');
      expect(reset1.season).toBe(2);

      const meta2 = await service.getMetadata();
      expect(meta2.season).toBe(2);

      // Reset again
      const reset2 = await service.resetSeason('mod_user');
      expect(reset2.season).toBe(3);

      const meta3 = await service.getMetadata();
      expect(meta3.season).toBe(3);
    });

    it('should preserve banlist and point rules after reset', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Ban a user
      await service.banUser('mod_user', 'banned_user', true);

      // Get metadata before reset
      const metaBefore = await service.getMetadata();
      expect(metaBefore.banlist).toContain('banned_user');
      const pointRulesBefore = metaBefore.point_rules;

      // Reset season
      await service.resetSeason('mod_user');

      // Verify banlist and point rules are preserved
      const metaAfter = await service.getMetadata();
      expect(metaAfter.banlist).toContain('banned_user');
      expect(metaAfter.point_rules).toEqual(pointRulesBefore);
    });

    it('should clear idempotency records after reset', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Award points
      await service.creditPoints('mission-014', 'user_n', 'ACTION_DECISIVE');

      // Try duplicate (should be blocked)
      const dupBefore = await service.creditPoints('mission-014', 'user_n', 'ACTION_DECISIVE');
      expect(dupBefore.message).toBe('Credit already applied');

      // Reset season
      await service.resetSeason('mod_user');

      // Same credit should now work (new season, cleared idempotency)
      const afterReset = await service.creditPoints('mission-014', 'user_n', 'ACTION_DECISIVE');
      expect(afterReset.ok).toBe(true);
      expect(afterReset.newTotal).toBe(3);
      expect(afterReset.message).not.toBe('Credit already applied');
    });
  });

  describe('7.4 Moderator Operations', () => {
    it('should exclude banned user from rankings', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Award points to users
      await service.creditPoints('mission-015', 'user_o', 'ACTION_DECISIVE');
      await service.creditPoints('mission-015', 'user_p', 'MISSION_SUCCESS');
      await service.creditPoints('mission-015', 'user_q', 'MISSION_FAIL');

      // Verify all users in rankings
      const topBefore = await service.getTopN(10);
      expect(topBefore).toHaveLength(3);
      expect(topBefore.some((e) => e.username === 'user_p')).toBe(true);

      // Ban user_p
      const banResult = await service.banUser('mod_user', 'user_p', true);
      expect(banResult.ok).toBe(true);
      expect(banResult.banned).toBe(true);

      // Verify banned user excluded from rankings
      const topAfter = await service.getTopN(10);
      expect(topAfter).toHaveLength(2);
      expect(topAfter.some((e) => e.username === 'user_p')).toBe(false);
      expect(topAfter.some((e) => e.username === 'user_o')).toBe(true);
      expect(topAfter.some((e) => e.username === 'user_q')).toBe(true);
    });

    it('should prevent banned user from earning new points', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Ban user
      await service.banUser('mod_user', 'user_r', true);

      // Try to credit banned user
      const result = await service.creditPoints('mission-016', 'user_r', 'ACTION_DECISIVE');
      expect(result.ok).toBe(false);
      expect(result.message).toBe('User is banned from leaderboard');
      expect(result.newTotal).toBe(0);

      // Verify no points awarded
      const personalRank = await service.getPersonalRank('user_r');
      expect(personalRank.points).toBe(0);
      expect(personalRank.banned).toBe(true);
    });

    it('should restore functionality when user is unbanned', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Ban user
      await service.banUser('mod_user', 'user_s', true);

      // Verify user is banned
      const creditWhileBanned = await service.creditPoints('mission-017', 'user_s', 'ACTION_DECISIVE');
      expect(creditWhileBanned.ok).toBe(false);

      // Unban user
      const unbanResult = await service.banUser('mod_user', 'user_s', false);
      expect(unbanResult.ok).toBe(true);
      expect(unbanResult.banned).toBe(false);

      // Verify user can now earn points
      const creditAfterUnban = await service.creditPoints('mission-017', 'user_s', 'ACTION_DECISIVE');
      expect(creditAfterUnban.ok).toBe(true);
      expect(creditAfterUnban.newTotal).toBe(3);

      // Verify user appears in rankings
      const topAfter = await service.getTopN(10);
      expect(topAfter.some((e) => e.username === 'user_s')).toBe(true);
    });

    it('should require moderator permission for season reset', async () => {
      // Try to reset without moderator permission
      const result = await service.resetSeason('regular_user');
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Moderator permission required');
      expect(result.season).toBe(0);

      // Verify season not changed
      const meta = await service.getMetadata();
      expect(meta.season).toBe(1);
    });

    it('should require moderator permission for ban operations', async () => {
      // Try to ban without moderator permission
      const banResult = await service.banUser('regular_user', 'user_t', true);
      expect(banResult.ok).toBe(false);
      expect(banResult.message).toBe('Moderator permission required');

      // Verify user not banned
      const meta = await service.getMetadata();
      expect(meta.banlist).not.toContain('user_t');
    });

    it('should handle bulk credit with banned users', async () => {
      // Set up moderator
      reddit.setModerators(['mod_user']);

      // Ban one user
      await service.banUser('mod_user', 'user_v', true);

      // Bulk credit including banned user
      const participants = ['user_u', 'user_v', 'user_w'];
      const result = await service.bulkCreditPoints('mission-018', participants, 'MISSION_SUCCESS');

      expect(result.ok).toBe(true);
      expect(result.updated).toBe(2); // Only user_u and user_w
      expect(result.skipped).toContain('user_v');

      // Verify points
      const rankU = await service.getPersonalRank('user_u');
      expect(rankU.points).toBe(5);

      const rankV = await service.getPersonalRank('user_v');
      expect(rankV.points).toBe(0);
      expect(rankV.banned).toBe(true);

      const rankW = await service.getPersonalRank('user_w');
      expect(rankW.points).toBe(5);
    });
  });
});
