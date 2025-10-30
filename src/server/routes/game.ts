import express from 'express';
import { redis, reddit, context } from '@devvit/web/server';
import { LeaderboardService } from '../services/leaderboard';
import { GameService } from '../services/game';

const router = express.Router();

/**
 * Example game routes demonstrating leaderboard integration
 * These are placeholder endpoints that show how to integrate the leaderboard
 * with actual game logic when the game is implemented
 */

// Initialize services
const leaderboardService = new LeaderboardService(redis, reddit, context);
const gameService = new GameService(leaderboardService, redis);

/**
 * POST /api/game/action
 * Handle a game action and award points if it's decisive
 *
 * Request body:
 * {
 *   missionId: string,
 *   action: any,
 *   isDecisive?: boolean  // Whether this action triggers a phase transition
 * }
 */
router.post('/api/game/action', async (req, res) => {
  try {
    const { missionId, isDecisive = false } = req.body;
    const username = await reddit.getCurrentUsername();

    if (!username) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!missionId) {
      return res.status(400).json({ success: false, message: 'missionId is required' });
    }

    // Record participant
    await gameService.recordParticipant(missionId, username);

    // Award points if this is a decisive action
    let pointsAwarded = false;
    if (isDecisive) {
      pointsAwarded = await gameService.handleDecisiveAction(missionId, username);
    }

    // Optional: Award participation points (uncomment to enable)
    // await gameService.handleVoteParticipation(missionId, username);

    res.json({
      success: true,
      pointsAwarded,
      message: pointsAwarded ? 'Action completed and points awarded' : 'Action completed',
    });
  } catch (error) {
    console.error('Game action error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

/**
 * POST /api/game/complete
 * Handle mission completion and award points to all participants
 *
 * Request body:
 * {
 *   missionId: string,
 *   outcome: 'success' | 'fail' | 'abort'
 * }
 */
router.post('/api/game/complete', async (req, res) => {
  try {
    const { missionId, outcome } = req.body;

    if (!missionId) {
      return res.status(400).json({ success: false, message: 'missionId is required' });
    }

    if (!['success', 'fail', 'abort'].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'Invalid outcome' });
    }

    // Award points to all participants
    const result = await gameService.handleMissionCompletion(
      missionId,
      outcome as 'success' | 'fail' | 'abort'
    );

    res.json({
      success: result.success,
      credited: result.credited,
      skipped: result.skipped,
      message: `Mission completed. Credited ${result.credited} participants.`,
    });
  } catch (error) {
    console.error('Mission completion error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

/**
 * GET /api/game/mission/:missionId/participants
 * Get all participants for a mission
 */
router.get('/api/game/mission/:missionId/participants', async (req, res) => {
  try {
    const { missionId } = req.params;

    if (!missionId) {
      return res.status(400).json({ success: false, message: 'missionId is required' });
    }

    const participants = await gameService.getParticipants(missionId);

    res.json({
      success: true,
      missionId,
      participants,
      count: participants.length,
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

export default router;
