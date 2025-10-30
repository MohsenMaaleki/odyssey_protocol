import express from 'express';
import { UnlockService } from '../services/unlock';
import { UNLOCK_TREE } from '../data/unlockTree';
import { redis, reddit, context } from '@devvit/web/server';
import {
  GetTreeResponse,
  UnlockStatus,
  PurchaseUnlockRequest,
  PurchaseResult,
  SeasonResetResult,
} from '../../shared/types/unlock';

const router = express.Router();

/**
 * GET /api/unlocks/tree
 * Returns the complete unlock tree and user's status
 */
router.get<unknown, GetTreeResponse | { error: string }>(
  '/api/unlocks/tree',
  async (_req, res): Promise<void> => {
    try {
      console.log('[Unlock] Fetching tree...');

      const username = await reddit.getCurrentUsername();
      console.log('[Unlock] Username:', username);

      if (!username) {
        console.error('[Unlock] No username found');
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      console.log('[Unlock] Creating service...');
      const service = new UnlockService(redis, reddit, context);

      console.log('[Unlock] Initializing user...');
      await service.initializeUser(username);

      console.log('[Unlock] Getting status...');
      const status = await service.getUnlockStatus(username);

      console.log('[Unlock] Returning tree and status');
      res.json({
        tree: UNLOCK_TREE,
        status,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('[Unlock] Error fetching unlock tree:', errorMessage);
      console.error('[Unlock] Stack:', errorStack);
      res.status(500).json({ error: `Failed to fetch unlock tree: ${errorMessage}` });
    }
  }
);

/**
 * GET /api/unlocks/status
 * Returns user's unlock status only
 */
router.get<unknown, UnlockStatus | { error: string }>(
  '/api/unlocks/status',
  async (_req, res): Promise<void> => {
    try {
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const service = new UnlockService(redis, reddit, context);
      const status = await service.getUnlockStatus(username);

      res.json(status);
    } catch (error) {
      console.error('Error fetching unlock status:', error);
      res.status(500).json({ error: 'Failed to fetch unlock status' });
    }
  }
);

/**
 * POST /api/unlocks/purchase
 * Purchase an unlock
 */
router.post<unknown, PurchaseResult | { error: string }, PurchaseUnlockRequest>(
  '/api/unlocks/purchase',
  async (req, res): Promise<void> => {
    console.log('[Unlock] ===== PURCHASE ENDPOINT HIT =====');
    try {
      console.log('[Unlock] Request body:', req.body);

      const username = await reddit.getCurrentUsername();
      console.log('[Unlock] Current username:', username);

      if (!username) {
        console.error('[Unlock] Not authenticated');
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.body;
      console.log('[Unlock] Unlock ID:', id);

      if (!id) {
        console.error('[Unlock] Missing unlock ID');
        res.status(400).json({ error: 'Unlock ID required' });
        return;
      }

      console.log('[Unlock] Creating service and attempting purchase...');
      const service = new UnlockService(redis, reddit, context);
      const result = await service.purchaseUnlock(username, id);
      console.log('[Unlock] Purchase result:', result);

      if (!result.ok) {
        console.error('[Unlock] Purchase failed:', result.message);
        // Determine appropriate status code based on error message
        if (result.message?.includes('Insufficient')) {
          res.status(402).json(result);
          return;
        }
        if (result.message?.includes('Prerequisites')) {
          res.status(409).json(result);
          return;
        }
        res.status(400).json(result);
        return;
      }

      console.log('[Unlock] Purchase successful');
      res.json(result);
    } catch (error) {
      console.error('[Unlock] Error purchasing unlock:', error);
      res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to purchase unlock',
      });
    }
  }
);

/**
 * POST /api/unlocks/reset
 * Reset season (moderator only)
 */
router.post<unknown, SeasonResetResult | { error: string }>(
  '/api/unlocks/reset',
  async (_req, res): Promise<void> => {
    try {
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const service = new UnlockService(redis, reddit, context);
      const result = await service.resetSeason(username);

      if (!result.ok) {
        res.status(403).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Error resetting season:', error);
      res.status(500).json({ error: 'Failed to reset season' });
    }
  }
);

export default router;
