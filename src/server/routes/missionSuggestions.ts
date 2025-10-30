import express from 'express';
import { redis, reddit, context } from '@devvit/web/server';
import { MissionSuggestionService } from '../services/missionSuggestions';
import type {
  SubmitSuggestionRequest,
  SubmitSuggestionResponse,
  VoteSuggestionRequest,
  VoteSuggestionResponse,
  ListSuggestionsResponse,
  ApproveSuggestionRequest,
  ApproveSuggestionResponse,
  RejectSuggestionRequest,
  RejectSuggestionResponse,
  CreateBallotRequest,
  CreateBallotResponse,
  GetCurrentBallotResponse,
  CloseBallotRequest,
  CloseBallotResponse,
  GetPromotedMissionResponse,
} from '../../shared/types/missionSuggestions';

const router = express.Router();

// Initialize MissionSuggestionService instance
const missionSuggestionService = new MissionSuggestionService(redis, reddit, context);

/**
 * POST /api/missions/suggest
 * Submit a new mission suggestion
 */
router.post('/api/missions/suggest', async (req, res): Promise<void> => {
  try {
    const body = req.body as SubmitSuggestionRequest;

    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();

    if (!username) {
      res.status(401).json({
        ok: false,
        message: 'Unable to verify user',
      } as SubmitSuggestionResponse);
      return;
    }

    // Validate required fields
    if (
      !body.title ||
      !body.target ||
      !body.risk ||
      !body.reward ||
      !body.description ||
      !body.payload_hint
    ) {
      res.status(400).json({
        ok: false,
        message: 'Missing required fields',
      } as SubmitSuggestionResponse);
      return;
    }

    // Call MissionSuggestionService.submitSuggestion()
    const result = await missionSuggestionService.submitSuggestion(
      body.title,
      body.target,
      body.risk,
      body.reward,
      body.description,
      body.payload_hint,
      username
    );

    // Return appropriate status code
    if (!result.ok) {
      // Check if it's a permission/ban error (403) or validation error (400)
      const statusCode =
        result.message?.includes('banned') || result.message?.includes('Maximum') ? 403 : 400;
      res.status(statusCode).json(result as SubmitSuggestionResponse);
      return;
    }

    res.status(200).json(result as SubmitSuggestionResponse);
  } catch (error) {
    console.error('Error in /api/missions/suggest:', error);
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    } as SubmitSuggestionResponse);
  }
});

/**
 * POST /api/missions/suggest/vote
 * Vote on a suggestion (idempotent)
 */
router.post('/api/missions/suggest/vote', async (req, res): Promise<void> => {
  try {
    const body = req.body as VoteSuggestionRequest;

    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();

    if (!username) {
      res.status(401).json({
        ok: false,
        up: 0,
        down: 0,
        total: 0,
        message: 'Unable to verify user',
      } as VoteSuggestionResponse);
      return;
    }

    // Validate required fields
    if (!body.suggestionId || body.value === undefined) {
      res.status(400).json({
        ok: false,
        up: 0,
        down: 0,
        total: 0,
        message: 'Missing required fields: suggestionId and value are required',
      } as VoteSuggestionResponse);
      return;
    }

    // Validate vote value
    if (body.value !== -1 && body.value !== 0 && body.value !== 1) {
      res.status(400).json({
        ok: false,
        up: 0,
        down: 0,
        total: 0,
        message: 'Invalid vote value: must be -1, 0, or 1',
      } as VoteSuggestionResponse);
      return;
    }

    // Call MissionSuggestionService.voteSuggestion()
    const result = await missionSuggestionService.voteSuggestion(
      body.suggestionId,
      username,
      body.value
    );

    // Return appropriate status code
    if (!result.ok) {
      const statusCode = result.message?.includes('not found') ? 404 : 400;
      res.status(statusCode).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/missions/suggest/vote:', error);
    res.status(500).json({
      ok: false,
      up: 0,
      down: 0,
      total: 0,
      message: error instanceof Error ? error.message : 'Internal server error',
    } as VoteSuggestionResponse);
  }
});

/**
 * GET /api/missions/suggest/list
 * List suggestions with filtering, sorting, and pagination
 */
router.get('/api/missions/suggest/list', async (req, res): Promise<void> => {
  try {
    // Parse query parameters
    const status = (req.query.status as string) || 'all';
    const page = parseInt(req.query.page as string, 10) || 1;
    const perPage = parseInt(req.query.perPage as string, 10) || 20;
    const sort = (req.query.sort as string) || 'new';
    const mine = req.query.mine === 'true';

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'archived', 'all'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        ok: false,
        message: `Invalid status: must be one of ${validStatuses.join(', ')}`,
      } as ListSuggestionsResponse);
      return;
    }

    // Validate sort
    const validSorts = ['top', 'new'];
    if (!validSorts.includes(sort)) {
      res.status(400).json({
        ok: false,
        message: `Invalid sort: must be one of ${validSorts.join(', ')}`,
      } as ListSuggestionsResponse);
      return;
    }

    // Validate pagination
    if (page < 1 || perPage < 1 || perPage > 100) {
      res.status(400).json({
        ok: false,
        message: 'Invalid pagination: page must be >= 1, perPage must be between 1 and 100',
      } as ListSuggestionsResponse);
      return;
    }

    // Get current username if filtering by "Mine"
    let filterUsername: string | undefined;
    if (mine) {
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({
          ok: false,
          message: 'Unable to verify user for "Mine" filter',
        } as ListSuggestionsResponse);
        return;
      }
      filterUsername = username;
    }

    // Call MissionSuggestionService.listSuggestions()
    const result = await missionSuggestionService.listSuggestions(
      status as any,
      page,
      perPage,
      sort as any,
      filterUsername
    );

    res.status(200).json({
      ok: true,
      data: result,
    } as ListSuggestionsResponse);
  } catch (error) {
    console.error('Error in /api/missions/suggest/list:', error);
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    } as ListSuggestionsResponse);
  }
});

/**
 * POST /api/missions/suggest/mod/reset
 * Reset all mission suggestions data (moderator only, for debugging)
 */
router.post('/api/missions/suggest/mod/reset', async (req, res): Promise<void> => {
  console.log('[MissionSuggestions] ===== RESET ENDPOINT HIT =====');
  try {
    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();

    if (!username) {
      res.status(401).json({
        ok: false,
        message: 'Unable to verify user',
      });
      return;
    }

    // Create service instance
    const service = new MissionSuggestionService(redis, reddit, context);

    // Verify current user is moderator
    const isModerator = await service.checkModeratorPermission(username);

    if (!isModerator) {
      res.status(403).json({
        ok: false,
        message: 'Moderator permission required',
      });
      return;
    }

    // Clear all data
    await redis.del('missionSuggestions');
    await redis.del('suggestions_meta');
    await redis.del('ballots');

    console.log('[MissionSuggestions] All data cleared successfully');

    res.status(200).json({
      ok: true,
      message: 'All mission suggestions data has been reset',
    });
  } catch (error) {
    console.error('Error in /api/missions/suggest/mod/reset:', error);
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/missions/suggest/mod/approve
 * Approve a suggestion (moderator only)
 */
router.post('/api/missions/suggest/mod/approve', async (req, res): Promise<void> => {
  console.log('[MissionSuggestions] ===== APPROVE ENDPOINT HIT =====');
  try {
    const body = req.body as ApproveSuggestionRequest;
    console.log('[MissionSuggestions] Approve request received:', body);

    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();
    console.log('[MissionSuggestions] Current username:', username);

    if (!username) {
      console.error('[MissionSuggestions] Unable to verify user');
      res.status(401).json({
        ok: false,
        message: 'Unable to verify user',
      } as ApproveSuggestionResponse);
      return;
    }

    // Create service instance per request to ensure fresh context
    const service = new MissionSuggestionService(redis, reddit, context);

    // Verify current user is moderator
    const isModerator = await service.checkModeratorPermission(username);
    console.log('[MissionSuggestions] Is moderator:', isModerator);

    if (!isModerator) {
      console.error('[MissionSuggestions] User is not a moderator');
      res.status(403).json({
        ok: false,
        message: 'Moderator permission required',
      } as ApproveSuggestionResponse);
      return;
    }

    // Validate required fields
    if (!body.suggestionId) {
      console.error('[MissionSuggestions] Missing suggestionId');
      res.status(400).json({
        ok: false,
        message: 'Missing required field: suggestionId',
      } as ApproveSuggestionResponse);
      return;
    }

    // Call MissionSuggestionService.approveSuggestion()
    console.log('[MissionSuggestions] Calling approveSuggestion service...');
    const result = await service.approveSuggestion(body.suggestionId, username);
    console.log('[MissionSuggestions] Approve result:', result);

    // Return appropriate status code
    if (!result.ok) {
      const statusCode = result.message?.includes('not found') ? 404 : 400;
      res.status(statusCode).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/missions/suggest/mod/approve:', error);
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    } as ApproveSuggestionResponse);
  }
});

/**
 * POST /api/missions/suggest/mod/reject
 * Reject a suggestion (moderator only)
 */
router.post('/api/missions/suggest/mod/reject', async (req, res): Promise<void> => {
  console.log('[MissionSuggestions] ===== REJECT ENDPOINT HIT =====');
  try {
    const body = req.body as RejectSuggestionRequest;
    console.log('[MissionSuggestions] Reject request received:', body);

    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();
    console.log('[MissionSuggestions] Current username:', username);

    if (!username) {
      console.error('[MissionSuggestions] Unable to verify user');
      res.status(401).json({
        ok: false,
        message: 'Unable to verify user',
      } as RejectSuggestionResponse);
      return;
    }

    // Create service instance per request to ensure fresh context
    const service = new MissionSuggestionService(redis, reddit, context);

    // Verify current user is moderator
    const isModerator = await service.checkModeratorPermission(username);
    console.log('[MissionSuggestions] Is moderator:', isModerator);

    if (!isModerator) {
      console.error('[MissionSuggestions] User is not a moderator');
      res.status(403).json({
        ok: false,
        message: 'Moderator permission required',
      } as RejectSuggestionResponse);
      return;
    }

    // Validate required fields
    if (!body.suggestionId) {
      console.error('[MissionSuggestions] Missing suggestionId');
      res.status(400).json({
        ok: false,
        message: 'Missing required field: suggestionId',
      } as RejectSuggestionResponse);
      return;
    }

    // Call MissionSuggestionService.rejectSuggestion()
    console.log('[MissionSuggestions] Calling rejectSuggestion service...');
    const result = await service.rejectSuggestion(
      body.suggestionId,
      username,
      body.reason
    );
    console.log('[MissionSuggestions] Reject result:', result);

    // Return appropriate status code
    if (!result.ok) {
      const statusCode = result.message?.includes('not found') ? 404 : 400;
      res.status(statusCode).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/missions/suggest/mod/reject:', error);
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    } as RejectSuggestionResponse);
  }
});

/**
 * POST /api/missions/ballot/create
 * Create a ballot with 2-4 approved suggestions (moderator only)
 */
router.post('/api/missions/ballot/create', async (req, res): Promise<void> => {
  try {
    const body = req.body as CreateBallotRequest;

    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();

    if (!username) {
      res.status(401).json({
        ok: false,
        message: 'Unable to verify user',
      } as CreateBallotResponse);
      return;
    }

    // Verify current user is moderator
    const isModerator = await missionSuggestionService.checkModeratorPermission(username);
    if (!isModerator) {
      res.status(403).json({
        ok: false,
        message: 'Moderator permission required',
      } as CreateBallotResponse);
      return;
    }

    // Validate required fields
    if (!body.suggestionIds || !Array.isArray(body.suggestionIds)) {
      res.status(400).json({
        ok: false,
        message: 'Missing or invalid suggestionIds array',
      } as CreateBallotResponse);
      return;
    }

    if (!body.closesInMinutes || typeof body.closesInMinutes !== 'number') {
      res.status(400).json({
        ok: false,
        message: 'Missing or invalid closesInMinutes',
      } as CreateBallotResponse);
      return;
    }

    // Validate suggestion count (2-4)
    if (body.suggestionIds.length < 2 || body.suggestionIds.length > 4) {
      res.status(400).json({
        ok: false,
        message: 'Ballot must contain between 2 and 4 suggestions',
      } as CreateBallotResponse);
      return;
    }

    // Call MissionSuggestionService.createBallot()
    const result = await missionSuggestionService.createBallot(
      body.suggestionIds,
      body.closesInMinutes
    );

    // Return appropriate status code
    if (!result.ok) {
      const statusCode = result.message?.includes('not found') ? 404 : 400;
      res.status(statusCode).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/missions/ballot/create:', error);
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    } as CreateBallotResponse);
  }
});

/**
 * GET /api/missions/ballot/current
 * Get the current open ballot with suggestions
 */
router.get('/api/missions/ballot/current', async (_req, res): Promise<void> => {
  try {
    // Call MissionSuggestionService.getCurrentBallot()
    const result = await missionSuggestionService.getCurrentBallot();

    res.status(200).json({
      ok: true,
      ballot: result.ballot,
      suggestions: result.suggestions,
    } as GetCurrentBallotResponse);
  } catch (error) {
    console.error('Error in /api/missions/ballot/current:', error);
    res.status(500).json({
      ok: false,
      ballot: null,
      suggestions: [],
    } as GetCurrentBallotResponse);
  }
});

/**
 * POST /api/missions/ballot/close
 * Close a ballot and determine winner (moderator only or scheduled action)
 */
router.post('/api/missions/ballot/close', async (req, res): Promise<void> => {
  try {
    const body = req.body as CloseBallotRequest;

    // Get current username from Reddit API
    const username = await reddit.getCurrentUsername();

    if (!username) {
      res.status(401).json({
        ok: false,
        message: 'Unable to verify user',
      } as CloseBallotResponse);
      return;
    }

    // Verify current user is moderator (scheduled actions would need different auth)
    const isModerator = await missionSuggestionService.checkModeratorPermission(username);
    if (!isModerator) {
      res.status(403).json({
        ok: false,
        message: 'Moderator permission required',
      } as CloseBallotResponse);
      return;
    }

    // Validate required fields
    if (!body.ballotId) {
      res.status(400).json({
        ok: false,
        message: 'Missing required field: ballotId',
      } as CloseBallotResponse);
      return;
    }

    // Call MissionSuggestionService.closeBallot()
    const result = await missionSuggestionService.closeBallot(body.ballotId);

    // Return appropriate status code
    if (!result.ok) {
      const statusCode = result.message?.includes('not found') ? 404 : 400;
      res.status(statusCode).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/missions/ballot/close:', error);
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    } as CloseBallotResponse);
  }
});

/**
 * GET /api/missions/ballot/promoted
 * Get the promoted mission (closed ballot winner) for game integration
 */
router.get('/api/missions/ballot/promoted', async (_req, res): Promise<void> => {
  try {
    // Call MissionSuggestionService.getPromotedMission()
    const result = await missionSuggestionService.getPromotedMission();

    res.status(200).json({
      ok: true,
      data: result,
    } as GetPromotedMissionResponse);
  } catch (error) {
    console.error('Error in /api/missions/ballot/promoted:', error);
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    } as GetPromotedMissionResponse);
  }
});

export default router;
