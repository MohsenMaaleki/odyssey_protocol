// server/utils/missionInit.ts
// Adapters to integrate Mission Service with Devvit
// NOTE: These are thin adapters that wrap existing Devvit integrations.
// Devvit docs:
// - Post Data: https://developers.reddit.com/docs/interactive_posts/post-data
// - Realtime: https://developers.reddit.com/docs/realtime/
// - Scheduled Actions: https://developers.reddit.com/docs/scheduled-actions/

import type { Request } from 'express';
import type { MissionPostData } from '../../shared/types/mission';
import { RealtimeService } from '../services/realtime';
import { UnlockService } from '../services/unlock';
import { LeaderboardService } from '../services/leaderboard';
import { GalleryService } from '../services/gallery';
import type { PostDataAdapter, ScheduleAdapter } from '../services/mission';

/**
 * Minimal Devvit Post Data API interface
 * Actual implementation injected via middleware
 */
interface DevvitPostDataApi {
  get<T = unknown>(postId: string, key: string): Promise<T | null>;
  set<T = unknown>(postId: string, key: string, value: T): Promise<void>;
}

const INITIAL_POSTDATA: MissionPostData = {
  mission_id: null,
  phase: 'IDLE',
  fuel: 0,
  hull: 100,
  crew: 100,
  success: 0,
  payload: null,
  engine: null,
  participants: [],
  decisive_actions: [],
  started_at: null,
  phase_started_at: null,
  launch_countdown_until: null,
  science_points_delta: 0,
  outcome: null,
  promoted_title: null,
  promoted_payload_hint: null,
};

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe clone helper with fallback for older runtimes
 * Node 22+ has structuredClone, but this provides compatibility
 */
const clone = <T>(v: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

/**
 * Build Post Data adapter for mission state
 * Preferred: Devvit Post Data (fallback to Redis)
 */
function buildPostDataAdapter(redis: any, postId: string): PostDataAdapter {
  const key = `mission:${postId}:data`;
  const dvPostData = (redis as any)?.devvitPostDataApi as
    | DevvitPostDataApi
    | undefined;

  if (dvPostData) {
    // Preferred: Devvit Post Data
    return {
      read: async () => {
        const data = await dvPostData.get<MissionPostData>(postId, 'mission');
        return data ?? INITIAL_POSTDATA;
      },

      write: async (mut) => {
        const cur = await dvPostData.get<MissionPostData>(postId, 'mission');
        const currentData = cur ?? INITIAL_POSTDATA;
        const next = mut(clone(currentData));
        await dvPostData.set(postId, 'mission', next);
        return next;
      },

      replace: async (next) => {
        await dvPostData.set(postId, 'mission', next);
        return next;
      },
    };
  }

  // Fallback: Redis
  return {
    read: async (): Promise<MissionPostData> => {
      const data = await redis.get(key);
      return data
        ? safeParse<MissionPostData>(data, INITIAL_POSTDATA)
        : INITIAL_POSTDATA;
    },

    write: async (
      mut: (p: MissionPostData) => MissionPostData
    ): Promise<MissionPostData> => {
      const current = await redis.get(key);
      const currentData = current
        ? safeParse<MissionPostData>(current, INITIAL_POSTDATA)
        : INITIAL_POSTDATA;

      const next = mut(clone(currentData));
      await redis.set(key, JSON.stringify(next));
      return next;
    },

    replace: async (next: MissionPostData): Promise<MissionPostData> => {
      await redis.set(key, JSON.stringify(next));
      return next;
    },
  };
}

/**
 * Build Schedule adapter for launch countdown
 * Scheduled Actions adapter (Devvit-ready; currently logs)
 */
function buildScheduleAdapter(scheduler: any, postId: string): ScheduleAdapter {
  return {
    scheduleLaunchAt: async (missionId: string, atIso: string) => {
      const jobId = `launch:${postId}:${missionId}`;
      console.log(`[Schedule] Would schedule ${jobId} at ${atIso}`);
      // TODO: await scheduler.runAt({ id: jobId, at: atIso, route: "/api/mission/launch", body: { missionId } });
    },

    cancelLaunch: async (missionId: string) => {
      const jobId = `launch:${postId}:${missionId}`;
      console.log(`[Schedule] Would cancel ${jobId}`);
      // TODO: await scheduler.cancel(jobId);
    },

    scheduleVoteCloseAt: async (missionId: string, atIso: string) => {
      const jobId = `voteclose:${postId}:${missionId}:${Date.parse(atIso)}`;
      console.log(`[Schedule] Would schedule ${jobId} at ${atIso}`);
      // TODO: await scheduler.runAt({ id: jobId, at: atIso, route: "/api/mission/close-vote", body: { missionId } });
    },
  };
}

/**
 * Build all mission adapters from Express request context
 * Returns configured services ready for mission operations
 */
export function buildMissionAdapters(req: Request) {
  // Extract Devvit context from request
  // These should be injected by your Devvit middleware
  const redis = (req as any).redis;
  const reddit = (req as any).reddit;
  const context = (req as any).context;
  const realtime = (req as any).realtime;
  const scheduler = (req as any).scheduler;
  const media = (req as any).media;

  if (!redis || !context) {
    throw new Error('Missing Devvit context in request');
  }

  const postId = context.postId ?? context.post?.id;
  if (!postId) {
    throw new Error('Missing postId in context');
  }

  // Build adapters
  const postData = buildPostDataAdapter(redis, postId);
  const schedule = buildScheduleAdapter(scheduler, postId);

  // Initialize services
  const realtimeService = new RealtimeService(realtime, redis);
  const unlocks = new UnlockService(redis, reddit, context);
  const leaderboard = new LeaderboardService(redis, reddit, context);
  const gallery = new GalleryService(redis, media);

  return {
    postData,
    realtime: realtimeService,
    unlocks,
    leaderboard,
    gallery,
    schedule,
  };
}
