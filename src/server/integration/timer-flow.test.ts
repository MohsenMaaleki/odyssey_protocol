import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RealtimeService } from '../services/realtime.js';
import type { RedisClient } from '@devvit/public-api';
import type { TimerKind } from '../../shared/types/realtime.js';

/**
 * Integration tests for end-to-end timer flow
 * These tests verify the complete lifecycle of countdown timers including:
 * - Starting countdowns and scheduled actions
 * - Timer expiration and state transitions
 * - Disconnect/reconnect scenarios with fallback mode
 * - Multiple concurrent timers
 */
describe('Timer Flow Integration Tests', () => {
  let realtimeService: RealtimeService;
  let mockRealtime: any;
  let mockRedis: RedisClient;
  let publishedMessages: any[] = [];
  let scheduledJobs: Map<string, { endsAt: Date; callback: () => void }> = new Map();

  beforeEach(() => {
    // Reset arrays
    publishedMessages = [];
    scheduledJobs = new Map();

    // Mock realtime API with message tracking
    mockRealtime = {
      send: vi.fn().mockImplementation((topic: string, message: any) => {
        publishedMessages.push({ topic, message });
        return Promise.resolve();
      }),
    };

    // Mock Redis client with in-memory storage
    const storage = new Map<string, Map<string, string>>();

    mockRedis = {
      hSet: vi.fn().mockImplementation((key: string, data: Record<string, string>) => {
        if (!storage.has(key)) {
          storage.set(key, new Map());
        }
        const hash = storage.get(key)!;
        Object.entries(data).forEach(([field, value]) => {
          hash.set(field, value);
        });
        return Promise.resolve();
      }),
      hGet: vi.fn().mockImplementation((key: string, field: string) => {
        const hash = storage.get(key);
        return Promise.resolve(hash?.get(field) || null);
      }),
      hGetAll: vi.fn().mockImplementation((key: string) => {
        const hash = storage.get(key);
        if (!hash) return Promise.resolve({});
        const result: Record<string, string> = {};
        hash.forEach((value, field) => {
          result[field] = value;
        });
        return Promise.resolve(result);
      }),
    } as unknown as RedisClient;

    realtimeService = new RealtimeService(mockRealtime, mockRedis);
  });

  afterEach(() => {
    vi.clearAllTimers();
    scheduledJobs.clear();
  });

  describe('Scenario 1: Start countdown, wait for expiration, verify scheduled action', () => {
    it('should start countdown, store deadline, and publish timer start message', async () => {
      const missionId = 'mission-test-1';
      const timerKind: TimerKind = 'LAUNCH';
      const durationMs = 5000; // 5 seconds
      const schedulerJobName = 'launch-countdown-test';

      // Start countdown
      await realtimeService.startCountdown(missionId, timerKind, durationMs, schedulerJobName);

      // Verify PostData was updated with deadline
      const postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData).toHaveProperty('launch_countdown_until');
      expect(postData.launch_countdown_until).toBeTruthy();

      // Verify deadline is approximately correct (within 100ms)
      const deadline = new Date(postData.launch_countdown_until!);
      const expectedDeadline = Date.now() + durationMs;
      expect(Math.abs(deadline.getTime() - expectedDeadline)).toBeLessThan(100);

      // Verify scheduled job metadata was stored
      const scheduledJobs = await mockRedis.hGetAll(`mission:${missionId}:scheduled_jobs`);
      expect(scheduledJobs).toHaveProperty(schedulerJobName);
      const jobData = JSON.parse(scheduledJobs[schedulerJobName]!);
      expect(jobData).toHaveProperty('endsAt');
      expect(jobData).toHaveProperty('missionId', missionId);

      // Verify timer start message was published
      const timerMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:timer`
      );
      expect(timerMessages).toHaveLength(1);
      expect(timerMessages[0].message).toMatchObject({
        t: 'timer',
        mission_id: missionId,
        timer: {
          kind: 'LAUNCH',
          status: 'running',
          ends_at: expect.any(String),
          now: expect.any(String),
        },
      });
    });

    it('should simulate scheduled action execution and publish ended state', async () => {
      const missionId = 'mission-test-2';
      const timerKind: TimerKind = 'BALLOT';
      const durationMs = 1000; // 1 second
      const schedulerJobName = 'ballot-countdown-test';

      // Start countdown
      await realtimeService.startCountdown(missionId, timerKind, durationMs, schedulerJobName);

      // Clear previous messages
      publishedMessages = [];

      // Simulate scheduled action execution (timer expiration)
      // In real scenario, this would be triggered by Devvit scheduler
      await realtimeService.endCountdown(missionId, timerKind);

      // Verify PostData was cleared
      const postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData.choices_open_until).toBe('');

      // Verify ended message was published
      const timerMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:timer`
      );
      expect(timerMessages).toHaveLength(1);
      expect(timerMessages[0].message).toMatchObject({
        t: 'timer',
        mission_id: missionId,
        timer: {
          kind: 'BALLOT',
          status: 'ended',
        },
      });
    });

    it('should publish authoritative HUD snapshot after timer expiration', async () => {
      const missionId = 'mission-test-3';
      const timerKind: TimerKind = 'PHASE';

      // End countdown (simulating scheduled action)
      await realtimeService.endCountdown(missionId, timerKind);

      // Publish authoritative HUD snapshot
      await realtimeService.publishHudUpdate(
        missionId,
        {
          fuel: 85,
          hull: 90,
          crew: 95,
          success: 70,
          phase: 'FLIGHT',
        },
        true // full snapshot
      );

      // Verify HUD snapshot was published with full flag
      const hudMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:hud`
      );
      expect(hudMessages).toHaveLength(1);
      expect(hudMessages[0].message).toMatchObject({
        t: 'hud',
        mission_id: missionId,
        full: true,
        hud: {
          fuel: 85,
          hull: 90,
          crew: 95,
          success: 70,
          phase: 'FLIGHT',
        },
      });
    });
  });

  describe('Scenario 2: Disconnect, verify fallback, reconnect, verify sync', () => {
    it('should handle disconnect by storing state in PostData for fallback', async () => {
      const missionId = 'mission-test-4';
      const timerKind: TimerKind = 'LAUNCH';
      const durationMs = 60000; // 1 minute
      const schedulerJobName = 'launch-fallback-test';

      // Start countdown
      await realtimeService.startCountdown(missionId, timerKind, durationMs, schedulerJobName);

      // Simulate disconnect - realtime messages fail
      mockRealtime.send.mockRejectedValueOnce(new Error('Connection lost'));

      // Try to publish HUD update during disconnect
      await expect(
        realtimeService.publishHudUpdate(missionId, { fuel: 75 }, false)
      ).rejects.toThrow('Connection lost');

      // Verify PostData still contains timer deadline for fallback mode
      const postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData).toHaveProperty('launch_countdown_until');
      expect(postData.launch_countdown_until).toBeTruthy();

      // Client can use this timestamp for fallback countdown
      const deadline = new Date(postData.launch_countdown_until!);
      const remainingMs = deadline.getTime() - Date.now();
      expect(remainingMs).toBeGreaterThan(0);
      expect(remainingMs).toBeLessThanOrEqual(durationMs);
    });

    it('should handle reconnection by publishing current state', async () => {
      const missionId = 'mission-test-5';
      const timerKind: TimerKind = 'BALLOT';

      // Publish current timer state after reconnection (simulating snapshot sync)
      const endsAt = new Date(Date.now() + 30000); // 30 seconds remaining
      
      // Count messages before
      const messageCountBefore = publishedMessages.length;
      
      await realtimeService.publishTimerState(missionId, timerKind, endsAt, 'running');

      // Verify a new message was published
      expect(publishedMessages.length).toBeGreaterThan(messageCountBefore);
      
      // Find the timer message we just published
      const timerMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:timer`
      );
      expect(timerMessages.length).toBeGreaterThan(0);
      
      // Verify the last timer message has the correct structure
      const lastTimerMessage = timerMessages[timerMessages.length - 1];
      expect(lastTimerMessage.message).toMatchObject({
        t: 'timer',
        mission_id: missionId,
        timer: {
          kind: 'BALLOT',
          status: 'running',
          ends_at: endsAt.toISOString(),
          now: expect.any(String),
        },
      });
    });

    it('should sync client state with snapshot after reconnection', async () => {
      const missionId = 'mission-test-6';

      // Clear previous messages
      publishedMessages = [];

      // Publish full HUD snapshot for sync
      await realtimeService.publishHudUpdate(
        missionId,
        {
          fuel: 60,
          hull: 70,
          crew: 80,
          success: 55,
          scienceDelta: 3,
          phase: 'LAUNCH',
        },
        true // full snapshot for sync
      );

      // Verify snapshot was published
      const hudMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:hud`
      );
      expect(hudMessages).toHaveLength(1);
      expect(hudMessages[0].message.full).toBe(true);
      expect(hudMessages[0].message.hud).toMatchObject({
        fuel: 60,
        hull: 70,
        crew: 80,
        success: 55,
        scienceDelta: 3,
        phase: 'LAUNCH',
      });
    });

    it('should handle multiple disconnect/reconnect cycles', async () => {
      const missionId = 'mission-test-7';
      const timerKind: TimerKind = 'PHASE';

      // Start countdown
      await realtimeService.startCountdown(missionId, timerKind, 45000, 'phase-test');

      // Simulate first disconnect
      mockRealtime.send.mockRejectedValueOnce(new Error('Disconnect 1'));
      await expect(
        realtimeService.publishHudUpdate(missionId, { fuel: 50 }, false)
      ).rejects.toThrow('Disconnect 1');

      // Reconnect and publish
      mockRealtime.send.mockResolvedValueOnce(undefined);
      await realtimeService.publishHudUpdate(missionId, { fuel: 50 }, false);

      // Simulate second disconnect
      mockRealtime.send.mockRejectedValueOnce(new Error('Disconnect 2'));
      await expect(
        realtimeService.publishHudUpdate(missionId, { hull: 60 }, false)
      ).rejects.toThrow('Disconnect 2');

      // Reconnect again and publish
      mockRealtime.send.mockResolvedValueOnce(undefined);
      await realtimeService.publishHudUpdate(missionId, { hull: 60 }, false);

      // Verify PostData persists through disconnects
      const postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData).toHaveProperty('phase_gate_until');
      expect(postData.phase_gate_until).toBeTruthy();
    });
  });

  describe('Scenario 3: Multiple concurrent timers', () => {
    it('should handle multiple timers of different kinds simultaneously', async () => {
      const missionId = 'mission-test-8';

      // Start LAUNCH countdown
      await realtimeService.startCountdown(missionId, 'LAUNCH', 60000, 'launch-concurrent-test');

      // Start BALLOT countdown
      await realtimeService.startCountdown(missionId, 'BALLOT', 120000, 'ballot-concurrent-test');

      // Start PHASE countdown
      await realtimeService.startCountdown(missionId, 'PHASE', 180000, 'phase-concurrent-test');

      // Verify all three timers are stored in PostData
      const postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData).toHaveProperty('launch_countdown_until');
      expect(postData).toHaveProperty('choices_open_until');
      expect(postData).toHaveProperty('phase_gate_until');

      // Verify all three timer start messages were published
      const timerMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:timer`
      );
      expect(timerMessages).toHaveLength(3);

      const launchMsg = timerMessages.find((m) => m.message.timer.kind === 'LAUNCH');
      const ballotMsg = timerMessages.find((m) => m.message.timer.kind === 'BALLOT');
      const phaseMsg = timerMessages.find((m) => m.message.timer.kind === 'PHASE');

      expect(launchMsg).toBeDefined();
      expect(ballotMsg).toBeDefined();
      expect(phaseMsg).toBeDefined();

      expect(launchMsg!.message.timer.status).toBe('running');
      expect(ballotMsg!.message.timer.status).toBe('running');
      expect(phaseMsg!.message.timer.status).toBe('running');
    });

    it('should handle independent expiration of concurrent timers', async () => {
      const missionId = 'mission-test-9';

      // Start two timers
      await realtimeService.startCountdown(missionId, 'LAUNCH', 5000, 'launch-expire-1');
      await realtimeService.startCountdown(missionId, 'BALLOT', 10000, 'ballot-expire-1');

      // Clear messages
      publishedMessages = [];

      // Expire LAUNCH timer first
      await realtimeService.endCountdown(missionId, 'LAUNCH');

      // Verify LAUNCH timer ended
      let postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData.launch_countdown_until).toBe('');

      // Verify BALLOT timer still active
      expect(postData.choices_open_until).toBeTruthy();
      const ballotDeadline = new Date(postData.choices_open_until!);
      expect(ballotDeadline.getTime()).toBeGreaterThan(Date.now());

      // Verify only LAUNCH ended message was published
      let timerMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:timer`
      );
      expect(timerMessages).toHaveLength(1);
      expect(timerMessages[0].message.timer.kind).toBe('LAUNCH');
      expect(timerMessages[0].message.timer.status).toBe('ended');

      // Clear messages
      publishedMessages = [];

      // Expire BALLOT timer
      await realtimeService.endCountdown(missionId, 'BALLOT');

      // Verify BALLOT timer ended
      postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData.choices_open_until).toBe('');

      // Verify BALLOT ended message was published
      timerMessages = publishedMessages.filter((m) => m.topic === `rt:mission:${missionId}:timer`);
      expect(timerMessages).toHaveLength(1);
      expect(timerMessages[0].message.timer.kind).toBe('BALLOT');
      expect(timerMessages[0].message.timer.status).toBe('ended');
    });

    it('should handle pause and resume of one timer while others run', async () => {
      const missionId = 'mission-test-10';

      // Start three timers
      await realtimeService.startCountdown(missionId, 'LAUNCH', 60000, 'launch-pause-test');
      await realtimeService.startCountdown(missionId, 'BALLOT', 120000, 'ballot-pause-test');
      await realtimeService.startCountdown(missionId, 'PHASE', 180000, 'phase-pause-test');

      // Clear messages
      publishedMessages = [];

      // Pause BALLOT timer
      await realtimeService.pauseCountdown(missionId, 'BALLOT', 90000);

      // Verify BALLOT timer is paused
      const pauseMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:timer` && m.message.timer.kind === 'BALLOT'
      );
      expect(pauseMessages).toHaveLength(1);
      expect(pauseMessages[0].message.timer.status).toBe('paused');

      // Verify other timers are still in PostData
      let postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData.launch_countdown_until).toBeTruthy();
      expect(postData.phase_gate_until).toBeTruthy();

      // Clear messages
      publishedMessages = [];

      // Resume BALLOT timer
      await realtimeService.resumeCountdown(missionId, 'BALLOT', 90000, 'ballot-resume-test');

      // Verify BALLOT timer is running again
      const resumeMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:timer` && m.message.timer.kind === 'BALLOT'
      );
      expect(resumeMessages).toHaveLength(1);
      expect(resumeMessages[0].message.timer.status).toBe('running');

      // Verify all timers are still in PostData
      postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData.launch_countdown_until).toBeTruthy();
      expect(postData.choices_open_until).toBeTruthy();
      expect(postData.phase_gate_until).toBeTruthy();
    });

    it('should handle HUD updates while multiple timers are active', async () => {
      const missionId = 'mission-test-11';

      // Start multiple timers
      await realtimeService.startCountdown(missionId, 'LAUNCH', 30000, 'launch-hud-test');
      await realtimeService.startCountdown(missionId, 'BALLOT', 60000, 'ballot-hud-test');

      // Clear messages
      publishedMessages = [];

      // Publish HUD updates while timers are running
      await realtimeService.publishHudUpdate(missionId, { fuel: 90 }, false);
      await realtimeService.publishHudUpdate(missionId, { hull: 85 }, false);
      await realtimeService.publishHudUpdate(missionId, { crew: 95 }, false);

      // Verify HUD messages were published
      const hudMessages = publishedMessages.filter(
        (m) => m.topic === `rt:mission:${missionId}:hud`
      );
      expect(hudMessages).toHaveLength(3);

      // Verify timers are still active
      const postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      expect(postData.launch_countdown_until).toBeTruthy();
      expect(postData.choices_open_until).toBeTruthy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle timer expiration with Redis failure', async () => {
      const missionId = 'mission-test-12';
      const timerKind: TimerKind = 'LAUNCH';

      // Mock Redis failure
      mockRedis.hSet = vi.fn().mockRejectedValueOnce(new Error('Redis unavailable'));

      // Attempt to end countdown
      await expect(realtimeService.endCountdown(missionId, timerKind)).rejects.toThrow(
        'Redis unavailable'
      );
    });

    it('should handle timer start with realtime publish failure', async () => {
      const missionId = 'mission-test-13';
      const timerKind: TimerKind = 'BALLOT';

      // Mock realtime failure
      mockRealtime.send.mockRejectedValueOnce(new Error('Realtime unavailable'));

      // Attempt to start countdown
      await expect(
        realtimeService.startCountdown(missionId, timerKind, 60000, 'test-job')
      ).rejects.toThrow('Realtime unavailable');
    });

    it('should handle concurrent operations on same timer', async () => {
      const missionId = 'mission-test-14';
      const timerKind: TimerKind = 'PHASE';

      // Start countdown
      await realtimeService.startCountdown(missionId, timerKind, 60000, 'concurrent-test-1');

      // Attempt to start same timer again (should update deadline)
      await realtimeService.startCountdown(missionId, timerKind, 120000, 'concurrent-test-2');

      // Verify PostData has the latest deadline
      const postData = await mockRedis.hGetAll(`mission:${missionId}:postdata`);
      const deadline = new Date(postData.phase_gate_until!);
      const expectedDeadline = Date.now() + 120000;
      expect(Math.abs(deadline.getTime() - expectedDeadline)).toBeLessThan(100);
    });
  });
});
