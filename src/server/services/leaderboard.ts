import type {
  CreditReason,
  CreditResult,
  BulkCreditResult,
  LeaderboardEntry,
  PersonalRank,
  SeasonResetResult,
  BanResult,
  LeaderboardMetadata,
} from '../../shared/types/leaderboard';

/**
 * Leaderboard Service
 * Manages point tracking, rankings, and seasonal leaderboard operations
 */
export class LeaderboardService {
  private redis: any;
  private reddit: any;
  private context: any;

  constructor(redis: any, reddit: any, context: any) {
    this.redis = redis;
    this.reddit = reddit;
    this.context = context;
  }

  /**
   * Initialize leaderboard storage if not present
   * Creates leaderboard hash, lb_meta JSON, and lb_recent hash with defaults
   */
  async initializeStorage(): Promise<void> {
    // Check if metadata already exists
    const existingMeta = await this.redis.get('lb_meta');

    if (!existingMeta) {
      // Create default metadata
      const defaultMeta: LeaderboardMetadata = {
        season: 1,
        season_started_at: new Date().toISOString(),
        season_ends_at: null,
        last_reset_at: null,
        banlist: [],
        point_rules: {
          ACTION_DECISIVE: 3,
          MISSION_SUCCESS: 5,
          MISSION_FAIL: 1,
          MISSION_ABORT: 1,
          VOTE_PARTICIPATION: 1,
        },
      };

      await this.saveMetadata(defaultMeta);
      console.log('Leaderboard metadata initialized');
    }

    // Leaderboard hash and lb_recent hash are created on-demand
    // No need to explicitly initialize empty hashes
  }

  /**
   * Credit points to a user for a specific action
   */
  async creditPoints(
    missionId: string,
    username: string,
    reason: CreditReason,
    points?: number
  ): Promise<CreditResult> {
    // Check if user is banned
    if (await this.isUserBanned(username)) {
      return {
        ok: false,
        newTotal: 0,
        message: 'User is banned from leaderboard',
      };
    }

    // Build idempotency key
    const idempotencyKey = this.buildIdempotencyKey(missionId, username, reason);

    // Check if credit already exists
    const recentCredits = await this.getRecentCredits();
    if (recentCredits[idempotencyKey]) {
      // Credit already applied, return current total
      const leaderboard = await this.getLeaderboard();
      const currentTotal = leaderboard[username] || 0;
      return {
        ok: true,
        newTotal: currentTotal,
        message: 'Credit already applied',
      };
    }

    // Get point value
    let pointValue: number;
    if (points !== undefined) {
      pointValue = points;
    } else {
      const meta = await this.getMetadata();
      pointValue = meta.point_rules[reason];
    }

    // Atomically increment user points using HINCRBY
    const newTotal = await this.redis.hIncrBy('leaderboard', username, pointValue);

    // Record credit in lb_recent
    recentCredits[idempotencyKey] = new Date().toISOString();
    await this.redis.hSet('lb_recent', idempotencyKey, recentCredits[idempotencyKey]);

    return {
      ok: true,
      newTotal,
      message: `Credited ${pointValue} points for ${reason}`,
    };
  }

  /**
   * Credit points to multiple users simultaneously
   */
  async bulkCreditPoints(
    missionId: string,
    usernames: string[],
    reason: CreditReason,
    points?: number
  ): Promise<BulkCreditResult> {
    let updated = 0;
    const skipped: string[] = [];

    // Process each user
    for (const username of usernames) {
      const result = await this.creditPoints(missionId, username, reason, points);

      if (result.ok && result.message !== 'Credit already applied') {
        updated++;
      } else {
        skipped.push(username);
      }
    }

    return {
      ok: true,
      updated,
      skipped,
    };
  }

  /**
   * Get top N ranked users
   */
  async getTopN(n: number): Promise<LeaderboardEntry[]> {
    // Get leaderboard and metadata
    const leaderboard = await this.getLeaderboard();
    const meta = await this.getMetadata();

    // Convert to array and filter out banned users
    const entries: Array<{ username: string; points: number }> = [];
    for (const [username, points] of Object.entries(leaderboard)) {
      if (!meta.banlist.includes(username)) {
        entries.push({ username, points });
      }
    }

    // Sort by points descending, then username ascending (tie-breaker)
    entries.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.username.localeCompare(b.username);
    });

    // Limit to N entries
    const topEntries = entries.slice(0, n);

    // Compute rank for each entry
    const result: LeaderboardEntry[] = topEntries.map((entry, index) => ({
      username: entry.username,
      points: entry.points,
      rank: index + 1,
    }));

    return result;
  }

  /**
   * Get personal rank and points for a user
   */
  async getPersonalRank(username: string): Promise<PersonalRank> {
    // Check if user is banned
    if (await this.isUserBanned(username)) {
      return {
        username,
        points: 0,
        rank: null,
        banned: true,
      };
    }

    // Get user's points
    const leaderboard = await this.getLeaderboard();
    const userPoints = leaderboard[username] || 0;

    // Compute rank by counting users with higher points
    let rank = 1;
    for (const [otherUsername, otherPoints] of Object.entries(leaderboard)) {
      // Skip banned users
      if (await this.isUserBanned(otherUsername)) {
        continue;
      }

      if (otherPoints > userPoints) {
        rank++;
      } else if (otherPoints === userPoints && otherUsername < username) {
        // Tie-breaker: alphabetical order
        rank++;
      }
    }

    return {
      username,
      points: userPoints,
      rank: userPoints > 0 ? rank : null,
    };
  }

  /**
   * Reset leaderboard for new season (moderator only)
   */
  async resetSeason(username: string, seasonEndsAt?: string): Promise<SeasonResetResult> {
    // Verify moderator permission
    if (!(await this.checkModeratorPermission(username))) {
      return {
        ok: false,
        season: 0,
        message: 'Moderator permission required',
      };
    }

    // Get current metadata
    const meta = await this.getMetadata();

    // Clear leaderboard hash
    await this.redis.del('leaderboard');

    // Clear lb_recent hash
    await this.redis.del('lb_recent');

    // Update metadata
    const now = new Date().toISOString();
    meta.season += 1;
    meta.season_started_at = now;
    meta.last_reset_at = now;
    meta.season_ends_at = seasonEndsAt || null;
    // Preserve banlist and point_rules

    await this.saveMetadata(meta);

    return {
      ok: true,
      season: meta.season,
      message: `Season ${meta.season} started`,
    };
  }

  /**
   * Ban or unban a user from leaderboard (moderator only)
   */
  async banUser(
    moderatorUsername: string,
    targetUsername: string,
    ban: boolean
  ): Promise<BanResult> {
    // Verify moderator permission
    if (!(await this.checkModeratorPermission(moderatorUsername))) {
      return {
        ok: false,
        username: targetUsername,
        banned: false,
        message: 'Moderator permission required',
      };
    }

    // Get current metadata
    const meta = await this.getMetadata();

    if (ban) {
      // Add to banlist if not already present
      if (!meta.banlist.includes(targetUsername)) {
        meta.banlist.push(targetUsername);
        await this.saveMetadata(meta);
        return {
          ok: true,
          username: targetUsername,
          banned: true,
          message: `User ${targetUsername} has been banned`,
        };
      } else {
        return {
          ok: true,
          username: targetUsername,
          banned: true,
          message: `User ${targetUsername} is already banned`,
        };
      }
    } else {
      // Remove from banlist
      const index = meta.banlist.indexOf(targetUsername);
      if (index > -1) {
        meta.banlist.splice(index, 1);
        await this.saveMetadata(meta);
        return {
          ok: true,
          username: targetUsername,
          banned: false,
          message: `User ${targetUsername} has been unbanned`,
        };
      } else {
        return {
          ok: true,
          username: targetUsername,
          banned: false,
          message: `User ${targetUsername} was not banned`,
        };
      }
    }
  }

  /**
   * Get leaderboard hash from Redis
   */
  private async getLeaderboard(): Promise<Record<string, number>> {
    const leaderboardData = await this.redis.hGetAll('leaderboard');
    if (!leaderboardData) {
      return {};
    }

    // Convert string values to numbers
    const leaderboard: Record<string, number> = {};
    for (const [username, points] of Object.entries(leaderboardData)) {
      leaderboard[username] = parseInt(points as string, 10);
    }

    return leaderboard;
  }

  /**
   * Get metadata from Redis
   */
  async getMetadata(): Promise<LeaderboardMetadata> {
    const metaJson = await this.redis.get('lb_meta');
    if (!metaJson) {
      // Return default metadata
      return {
        season: 1,
        season_started_at: new Date().toISOString(),
        season_ends_at: null,
        last_reset_at: null,
        banlist: [],
        point_rules: {
          ACTION_DECISIVE: 3,
          MISSION_SUCCESS: 5,
          MISSION_FAIL: 1,
          MISSION_ABORT: 1,
          VOTE_PARTICIPATION: 1,
        },
      };
    }
    return JSON.parse(metaJson) as LeaderboardMetadata;
  }

  /**
   * Save metadata to Redis
   */
  private async saveMetadata(meta: LeaderboardMetadata): Promise<void> {
    await this.redis.set('lb_meta', JSON.stringify(meta));
  }

  /**
   * Get recent credits hash from Redis
   */
  private async getRecentCredits(): Promise<Record<string, string>> {
    const recentData = await this.redis.hGetAll('lb_recent');
    if (!recentData) {
      return {};
    }
    return recentData as Record<string, string>;
  }

  /**
   * Build idempotency key from mission_id, username, and reason
   */
  private buildIdempotencyKey(missionId: string, username: string, reason: string): string {
    return `${missionId}:${username}:${reason}`;
  }

  /**
   * Check if user is banned
   */
  private async isUserBanned(username: string): Promise<boolean> {
    const meta = await this.getMetadata();
    return meta.banlist.includes(username);
  }

  /**
   * Check if user has moderator permission
   */
  private async checkModeratorPermission(username: string): Promise<boolean> {
    try {
      const subredditName = this.context.subredditName;
      if (!subredditName) {
        return false;
      }

      // Get moderators list from Reddit API
      const moderators = await this.reddit.getModerators({
        subredditName,
      });

      // Check if username is in moderators list
      return moderators.some((mod: any) => mod.username === username);
    } catch (error) {
      console.error('Error checking moderator permission:', error);
      return false;
    }
  }

  /**
   * Credit decisive action users (convenience method for missions)
   */
  async creditDecisive(missionId: string, usernames: string[]): Promise<void> {
    await this.bulkCreditPoints(missionId, usernames, 'ACTION_DECISIVE');
  }

  /**
   * Bulk credit participants (convenience method for missions)
   */
  async bulkCreditParticipants(
    missionId: string,
    usernames: string[],
    reason: 'MISSION_SUCCESS' | 'MISSION_FAIL' | 'MISSION_ABORT'
  ): Promise<void> {
    await this.bulkCreditPoints(missionId, usernames, reason);
  }
}
