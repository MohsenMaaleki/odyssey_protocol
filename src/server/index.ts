import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, reddit, media, createServer, context, getServerPort, realtime } from '@devvit/web/server';
import { createPost } from './core/post';
import galleryRouter from './routes/gallery';
import { GalleryService } from './services/gallery';
import leaderboardRouter from './routes/leaderboard';
import { LeaderboardService } from './services/leaderboard';
import gameRouter from './routes/game';
import unlockRouter from './routes/unlock';
import { UnlockService } from './services/unlock';
import missionSuggestionsRouter from './routes/missionSuggestions';
import { MissionSuggestionService } from './services/missionSuggestions';
import missionRouter from './routes/mission';
import { RealtimeService } from './services/realtime';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

// Initialize RealtimeService
const realtimeService = new RealtimeService(realtime, redis);

// Export for use in other modules
export { realtimeService };

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    // Initialize gallery storage
    const galleryService = new GalleryService(redis, media);
    await galleryService.initializeStorage();
    console.log('Gallery storage initialized successfully');

    // Initialize leaderboard storage
    const leaderboardService = new LeaderboardService(redis, reddit, context);
    await leaderboardService.initializeStorage();
    console.log('Leaderboard storage initialized successfully');

    // Initialize unlock storage
    const unlockService = new UnlockService(redis, reddit, context);
    // Set initial global season to 1
    const currentSeason = await redis.get('unlock:season');
    if (!currentSeason) {
      await redis.set('unlock:season', '1');
      console.log('Unlock storage initialized with season 1');
    }

    // Initialize mission suggestions storage
    const missionSuggestionService = new MissionSuggestionService(redis, reddit, context);
    await missionSuggestionService.initializeStorage();
    console.log('Mission suggestions storage initialized successfully');

    // Create initial post
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}. Gallery, leaderboard, unlock, and mission suggestions storage initialized.`,
    });
  } catch (error) {
    console.error(`Error during app installation: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to complete app installation',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Scheduled action: Auto-close expired ballots
router.post('/internal/scheduler/auto-close-ballots', async (_req, res): Promise<void> => {
  try {
    console.log(`[Scheduler] Auto-close ballots task started at ${new Date().toISOString()}`);
    
    const missionSuggestionService = new MissionSuggestionService(redis, reddit, context);
    
    // Get all ballots
    const ballotsJson = await redis.get('global:ballots');
    if (!ballotsJson) {
      console.log('[Scheduler] No ballots found in storage');
      res.status(200).json({ status: 'ok', message: 'No ballots to process' });
      return;
    }
    
    const ballots = JSON.parse(ballotsJson);
    const now = new Date();
    let closedCount = 0;
    
    // Find and close expired ballots
    for (const ballot of ballots) {
      if (ballot.status === 'open') {
        const closesAt = new Date(ballot.closes_at);
        
        if (now >= closesAt) {
          console.log(`[Scheduler] Closing expired ballot ${ballot.id} (closed at ${ballot.closes_at})`);
          
          const result = await missionSuggestionService.closeBallot(ballot.id);
          
          if (result.ok) {
            closedCount++;
            console.log(`[Scheduler] Successfully closed ballot ${ballot.id}, winner: ${result.winner_id}`);
          } else {
            console.error(`[Scheduler] Failed to close ballot ${ballot.id}: ${result.message}`);
          }
        }
      }
    }
    
    console.log(`[Scheduler] Auto-close task completed. Closed ${closedCount} ballot(s)`);
    res.status(200).json({ 
      status: 'ok', 
      message: `Processed ballots, closed ${closedCount}`,
      closedCount 
    });
  } catch (error) {
    console.error(`[Scheduler] Error in auto-close ballots task:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process ballot auto-closure',
    });
  }
});

// Scheduled action: Process expired mission timers
router.post('/internal/scheduler/process-timers', async (_req, res): Promise<void> => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[Scheduler] [${timestamp}] Process timers task started`);
    
    // Get list of all mission IDs that have scheduled jobs
    // Note: In production, you'd maintain a list of active missions
    // For now, we'll check a known set or use a registry
    const missionRegistry = await redis.get('global:active_missions');
    if (!missionRegistry) {
      console.log(`[Scheduler] [${timestamp}] No active missions found`);
      res.status(200).json({ status: 'ok', message: 'No active missions' });
      return;
    }
    
    const missionIds: string[] = JSON.parse(missionRegistry);
    const now = new Date();
    let processedCount = 0;
    let errorCount = 0;
    
    for (const missionId of missionIds) {
      const key = `mission:${missionId}:scheduled_jobs`;
      
      try {
        const jobs = await redis.hGetAll(key);
        
        if (!jobs || Object.keys(jobs).length === 0) continue;
        
        for (const [jobName, jobDataStr] of Object.entries(jobs)) {
          try {
            const jobData = JSON.parse(jobDataStr);
            const endsAt = new Date(jobData.endsAt);
            
            // Check if timer has expired
            if (now >= endsAt) {
              console.log(
                `[Scheduler] [${timestamp}] Processing expired timer ${jobName} for mission ${missionId}`,
                { endsAt: endsAt.toISOString(), now: now.toISOString() }
              );
              
              // Determine timer kind from job name
              let timerKind: 'LAUNCH' | 'BALLOT' | 'PHASE' = 'PHASE';
              if (jobName.includes('launch')) timerKind = 'LAUNCH';
              else if (jobName.includes('ballot')) timerKind = 'BALLOT';
              
              // End the timer
              await realtimeService.endCountdown(missionId, timerKind);
              
              // Fetch current mission state for HUD snapshot
              const stateData = await redis.hGetAll(`mission:${missionId}:state`);
              if (stateData && Object.keys(stateData).length > 0) {
                await realtimeService.publishHudUpdate(
                  missionId,
                  {
                    fuel: parseInt(stateData.fuel || '100'),
                    hull: parseInt(stateData.hull || '100'),
                    crew: parseInt(stateData.crew || '100'),
                    success: parseInt(stateData.success || '50'),
                    scienceDelta: parseInt(stateData.science_points || '0'),
                    phase: stateData.phase || 'DESIGN',
                  },
                  true // full snapshot
                );
              }
              
              // Remove the job from scheduled jobs
              await redis.hDel(key, [jobName]);
              processedCount++;
              
              console.log(
                `[Scheduler] [${timestamp}] Successfully processed timer ${jobName} for mission ${missionId}`
              );
            }
          } catch (error) {
            errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(
              `[Scheduler] [${timestamp}] Error processing job ${jobName} for mission ${missionId}:`,
              {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                jobName,
                missionId,
              }
            );
          }
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[Scheduler] [${timestamp}] Error fetching jobs for mission ${missionId}:`,
          {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            missionId,
          }
        );
      }
    }
    
    console.log(
      `[Scheduler] [${timestamp}] Process timers task completed. Processed ${processedCount} timer(s), ${errorCount} error(s)`
    );
    res.status(200).json({
      status: 'ok',
      message: `Processed ${processedCount} expired timers`,
      processedCount,
      errorCount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Scheduler] [${timestamp}] Error in process timers task:`,
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }
    );
    res.status(500).json({
      status: 'error',
      message: 'Failed to process timers',
      error: errorMessage,
    });
  }
});

// Use router middleware
app.use(router);

// Mount gallery routes
app.use(galleryRouter);

// Mount leaderboard routes
app.use(leaderboardRouter);

// Mount game routes
app.use(gameRouter);

// Mount unlock routes
app.use(unlockRouter);

// Mount mission suggestions routes
app.use(missionSuggestionsRouter);

// Mount mission routes
app.use(missionRouter);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
