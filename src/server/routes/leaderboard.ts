import express from 'express';
import { redis, reddit, context } from '@devvit/web/server';
import { LeaderboardService } from '../services/leaderboard';
import type {
  CreditPointsRequest,
  BulkCreditPointsRequest,
  ResetSeasonRequest,
  BanUserRequest,
  GetTopResponse,
} from '../../shared/types/leaderboard';

const router = express.Router();

// Initialize LeaderboardService instance
const leaderboardService = new LeaderboardService(redis, reddit, context);

/**
 * POST /api/leaderboard/credit
 * Award points to a single user for a specific action (server-side only)
 */
router.post('/api/leaderboard/credit', async (req, res): Promise<void> => {
  try {
    const body = req.body as CreditPointsRequest;

    // Validate required fields
    if (!body.mission_id || !body.username || !body.reason) {
      res.status(400).json({
        ok: false,
        newTotal: 0,
        message: 'Missing required fields: mission_id, username, and reason are required',
      });
      return;
    }

    // Validate reason is a valid CreditReason
    const validReasons = [
      'ACTION_DECISIVE',
      'MISSION_SUCCESS',
      'MISSION_FAIL',
      'MISSION_ABORT',
      'VOTE_PARTICIPATION',
    ];
    if (!validReasons.includes(body.reason)) {
      res.status(400).json({
        ok: false,
        newTotal: 0,
        message: `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
      });
      return;
    }

    // Call leaderboardService.creditPoints()
    const result = await leaderboardService.creditPoints(
      body.mission_id,
      body.username,
      body.reason,
      body.points
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/leaderboard/credit:', error);
    res.status(500).json({
      ok: false,
      newTotal: 0,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/leaderboard/bulk-credit
 * Award points to multiple users simultaneously (server-side only)
 */
router.post('/api/leaderboard/bulk-credit', async (req, res): Promise<void> => {
  try {
    const body = req.body as BulkCreditPointsRequest;

    // Validate required fields
    if (!body.mission_id || !body.usernames || !body.reason) {
      res.status(400).json({
        ok: false,
        updated: 0,
        skipped: [],
        message: 'Missing required fields: mission_id, usernames, and reason are required',
      });
      return;
    }

    // Validate usernames is an array
    if (!Array.isArray(body.usernames)) {
      res.status(400).json({
        ok: false,
        updated: 0,
        skipped: [],
        message: 'usernames must be an array',
      });
      return;
    }

    // Validate reason is a valid CreditReason
    const validReasons = [
      'ACTION_DECISIVE',
      'MISSION_SUCCESS',
      'MISSION_FAIL',
      'MISSION_ABORT',
      'VOTE_PARTICIPATION',
    ];
    if (!validReasons.includes(body.reason)) {
      res.status(400).json({
        ok: false,
        updated: 0,
        skipped: [],
        message: `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
      });
      return;
    }

    // Call leaderboardService.bulkCreditPoints()
    const result = await leaderboardService.bulkCreditPoints(
      body.mission_id,
      body.usernames,
      body.reason,
      body.points
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/leaderboard/bulk-credit:', error);
    res.status(500).json({
      ok: false,
      updated: 0,
      skipped: [],
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/leaderboard/top
 * Retrieve top N ranked users
 */
router.get('/api/leaderboard/top', async (req, res): Promise<void> => {
  try {
    // Parse query parameter n (default 10, max 100)
    let n = 10;
    if (req.query.n) {
      const parsedN = parseInt(req.query.n as string, 10);
      if (isNaN(parsedN) || parsedN < 1) {
        res.status(400).json({
          entries: [],
          season: 0,
          season_started_at: '',
          season_ends_at: null,
          message: 'Invalid n parameter: must be a positive integer',
        });
        return;
      }
      n = Math.min(parsedN, 100); // Cap at 100
    }

    // Call leaderboardService.getTopN()
    const entries = await leaderboardService.getTopN(n);

    // Get season metadata
    const metadata = await leaderboardService.getMetadata();

    // Return entries with season information
    const response: GetTopResponse = {
      entries,
      season: metadata.season,
      season_started_at: metadata.season_started_at,
      season_ends_at: metadata.season_ends_at,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in /api/leaderboard/top:', error);
    res.status(500).json({
      entries: [],
      season: 0,
      season_started_at: '',
      season_ends_at: null,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/leaderboard/me
 * Get current user's rank and points
 */
router.get('/api/leaderboard/me', async (_req, res): Promise<void> => {
  try {
    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();

    if (!username) {
      res.status(401).json({
        username: 'anonymous',
        points: 0,
        rank: null,
        message: 'Unable to verify user',
      });
      return;
    }

    // Call leaderboardService.getPersonalRank()
    const personalRank = await leaderboardService.getPersonalRank(username);

    res.status(200).json(personalRank);
  } catch (error) {
    console.error('Error in /api/leaderboard/me:', error);
    res.status(500).json({
      username: 'anonymous',
      points: 0,
      rank: null,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/leaderboard/reset
 * Reset leaderboard for new season (moderator only)
 */
router.post('/api/leaderboard/reset', async (req, res): Promise<void> => {
  try {
    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();

    if (!username) {
      res.status(401).json({
        ok: false,
        season: 0,
        message: 'Unable to verify user',
      });
      return;
    }

    // Parse optional season_ends_at from request body
    const body = req.body as ResetSeasonRequest;
    const seasonEndsAt = body.season_ends_at;

    // Call leaderboardService.resetSeason() (includes moderator verification)
    const result = await leaderboardService.resetSeason(username, seasonEndsAt);

    // Return 403 if not moderator
    if (!result.ok && result.message === 'Moderator permission required') {
      res.status(403).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/leaderboard/reset:', error);
    res.status(500).json({
      ok: false,
      season: 0,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/leaderboard/ban
 * Ban or unban a user from leaderboard (moderator only)
 */
router.post('/api/leaderboard/ban', async (req, res): Promise<void> => {
  try {
    // Get current username from Reddit API
    const moderatorUsername = await reddit.getCurrentUsername();

    if (!moderatorUsername) {
      res.status(401).json({
        ok: false,
        username: '',
        banned: false,
        message: 'Unable to verify user',
      });
      return;
    }

    // Parse username and ban boolean from request body
    const body = req.body as BanUserRequest;

    if (!body.username || typeof body.ban !== 'boolean') {
      res.status(400).json({
        ok: false,
        username: body.username || '',
        banned: false,
        message: 'Missing required fields: username and ban (boolean) are required',
      });
      return;
    }

    // Call leaderboardService.banUser() (includes moderator verification)
    const result = await leaderboardService.banUser(moderatorUsername, body.username, body.ban);

    // Return 403 if not moderator
    if (!result.ok && result.message === 'Moderator permission required') {
      res.status(403).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/leaderboard/ban:', error);
    res.status(500).json({
      ok: false,
      username: '',
      banned: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
