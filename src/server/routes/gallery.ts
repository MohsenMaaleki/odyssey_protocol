import express from 'express';
import type {
  SavePatchRequest,
  SavePatchResponse,
  ListGalleryResponse,
  GetGalleryItemResponse,
  DeleteGalleryItemResponse,
} from '../../shared/types/gallery';
import { GalleryService } from '../services/gallery';
import { redis, reddit, media } from '@devvit/web/server';

const router = express.Router();

// Initialize gallery service
const galleryService = new GalleryService(redis, media);

/**
 * POST /api/gallery/save-patch
 * Creates or updates a gallery entry for a completed mission
 */
router.post<unknown, SavePatchResponse, SavePatchRequest>(
  '/api/gallery/save-patch',
  async (req, res): Promise<void> => {
    try {
      // Validate request body
      const missionData = req.body;

      if (!missionData || typeof missionData !== 'object') {
        res.status(400).json({
          status: 'error',
          message: 'Invalid request body',
        });
        return;
      }

      // Validate required fields
      const requiredFields = [
        'mission_id',
        'phase',
        'fuel',
        'hull',
        'crew_morale',
        'success_chance',
        'science_points_delta',
        'log',
        'design',
      ];

      for (const field of requiredFields) {
        if (!(field in missionData)) {
          res.status(400).json({
            status: 'error',
            message: `Missing required field: ${field}`,
          });
          return;
        }
      }

      // Get current username from Reddit API
      const username = await reddit.getCurrentUsername();

      if (!username) {
        res.status(401).json({
          status: 'error',
          message: 'Unable to get current user',
        });
        return;
      }

      // Call galleryService.saveMissionPatch()
      const entry = await galleryService.saveMissionPatch(missionData, username);

      // Return success response
      res.json({
        status: 'success',
        message: 'Mission patch saved successfully',
        entry,
      });
    } catch (error) {
      console.error('Error saving mission patch:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to save mission patch',
      });
    }
  }
);

/**
 * GET /api/gallery/list
 * Returns paginated list of gallery entries
 */
router.get<unknown, ListGalleryResponse>('/api/gallery/list', async (req, res): Promise<void> => {
  try {
    // Parse query parameters with defaults
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 12;

    // Validate pagination parameters
    if (page < 1 || perPage < 1) {
      res.status(400).json({
        status: 'error',
        entries: [],
        total: 0,
        page: 1,
        perPage: 12,
        totalPages: 0,
      });
      return;
    }

    // Call galleryService.listGalleryEntries()
    const response = await galleryService.listGalleryEntries(page, perPage);

    // Return paginated response
    res.json(response);
  } catch (error) {
    console.error('Error listing gallery entries:', error);
    res.status(500).json({
      status: 'error',
      entries: [],
      total: 0,
      page: 1,
      perPage: 12,
      totalPages: 0,
    });
  }
});

/**
 * GET /api/gallery/item/:id
 * Returns a single gallery entry by ID
 */
router.get<{ id: string }, GetGalleryItemResponse>(
  '/api/gallery/item/:id',
  async (req, res): Promise<void> => {
    try {
      // Extract id from route parameters
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          status: 'error',
          message: 'Gallery entry ID is required',
        });
        return;
      }

      // Call galleryService.getGalleryEntry()
      const entry = await galleryService.getGalleryEntry(id);

      // Return entry or 404 if not found
      if (!entry) {
        res.status(404).json({
          status: 'error',
          message: `Gallery entry ${id} not found`,
        });
        return;
      }

      res.json({
        status: 'success',
        entry,
      });
    } catch (error) {
      console.error(`Error getting gallery entry:`, error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to get gallery entry',
      });
    }
  }
);

/**
 * GET /api/gallery/is-moderator
 * Checks if the current user is a moderator
 */
router.get<unknown, { isModerator: boolean }>(
  '/api/gallery/is-moderator',
  async (_req, res): Promise<void> => {
    try {
      const username = await reddit.getCurrentUsername();

      if (!username) {
        res.json({ isModerator: false });
        return;
      }

      // Get the current subreddit from context
      const { context } = await import('@devvit/web/server');
      const { subredditName } = context;

      if (!subredditName) {
        res.json({ isModerator: false });
        return;
      }

      // Check if user is a moderator by getting subreddit info
      try {
        const subreddit = await reddit.getSubredditInfoByName(subredditName);
        const currentUser = await reddit.getCurrentUser();
        
        // Check if current user is a moderator
        // For dev/test subreddits, also check if user is the creator
        const isModerator = currentUser?.id === subreddit?.creatorId || 
                           subredditName.includes('_dev') || 
                           subredditName.includes('_test');

        console.log(`[Gallery] Moderator check for ${username} in r/${subredditName}: ${isModerator}`);
        res.json({ isModerator });
      } catch (modCheckError) {
        // Fallback: For dev/test subreddits, assume moderator
        const isDevSubreddit = subredditName.includes('_dev') || subredditName.includes('_test');
        console.log(`[Gallery] Moderator check fallback for ${username}: ${isDevSubreddit}`);
        res.json({ isModerator: isDevSubreddit });
      }
    } catch (error) {
      console.error('Error checking moderator status:', error);
      res.json({ isModerator: false });
    }
  }
);

/**
 * DELETE /api/gallery/item/:id
 * Deletes a gallery entry (moderators only)
 */
router.delete<{ id: string }, DeleteGalleryItemResponse>(
  '/api/gallery/item/:id',
  async (req, res): Promise<void> => {
    try {
      // Extract id from route parameters
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          status: 'error',
          message: 'Gallery entry ID is required',
        });
        return;
      }

      // Check moderator permissions via Reddit API
      const username = await reddit.getCurrentUsername();

      if (!username) {
        res.status(401).json({
          status: 'error',
          message: 'Unable to verify user permissions',
        });
        return;
      }

      // Get the current subreddit from context
      const { context } = await import('@devvit/web/server');
      const { subredditName } = context;

      if (!subredditName) {
        res.status(400).json({
          status: 'error',
          message: 'Unable to determine subreddit context',
        });
        return;
      }

      // Check if user is a moderator
      let isModerator = false;
      try {
        const subreddit = await reddit.getSubredditInfoByName(subredditName);
        const currentUser = await reddit.getCurrentUser();
        
        // Check if current user is a moderator or creator
        isModerator = currentUser?.id === subreddit?.creatorId || 
                     subredditName.includes('_dev') || 
                     subredditName.includes('_test');
      } catch (modCheckError) {
        // Fallback: For dev/test subreddits, assume moderator
        isModerator = subredditName.includes('_dev') || subredditName.includes('_test');
      }

      if (!isModerator) {
        console.log(`[Gallery] User ${username} is not a moderator of r/${subredditName}`);
        res.status(403).json({
          status: 'error',
          message: 'Only moderators can delete gallery entries',
        });
        return;
      }

      // Call galleryService.deleteGalleryEntry()
      const success = await galleryService.deleteGalleryEntry(id, isModerator);

      if (!success) {
        res.status(404).json({
          status: 'error',
          message: `Gallery entry ${id} not found`,
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Gallery entry deleted successfully',
      });
    } catch (error) {
      console.error(`Error deleting gallery entry:`, error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete gallery entry',
      });
    }
  }
);

// Export the router
export default router;
