import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealtimeService } from './realtime.js';
import type { RedisClient } from '@devvit/public-api';
import type { HudData, TimerKind, TimerStatus } from '../../shared/types/realtime.js';

describe('RealtimeService', () => {
  let realtimeService: RealtimeService;
  let mockRealtime: any;
  let mockRedis: RedisClient;

  beforeEach(() => {
    // Mock realtime API
    mockRealtime = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    // Mock Redis client
    mockRedis = {
      hSet: vi.fn().mockResolvedValue(undefined),
    } as unknown as RedisClient;

    realtimeService = new RealtimeService(mockRealtime, mockRedis);
  });

  describe('publishHudUpdate', () => {
    it('should publish HUD update with fuel data', async () => {
      const missionId = 'mission-123';
      const hudData: HudData = { fuel: 75 };

      await realtimeService.publishHudUpdate(missionId, hudData, false);

      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-123:hud',
        expect.objectContaining({
          t: 'hud',
          mission_id: missionId,
          hud: hudData,
          full: false,
          ts: expect.any(Number),
        })
      );
    });

    it('should publish HUD update with all stats', async () => {
      const missionId = 'mission-456';
      const hudData: HudData = {
        fuel: 80,
        hull: 90,
        crew: 100,
        success: 65,
        scienceDelta: 5,
      };

      await realtimeService.publishHudUpdate(missionId, hudData, true);

      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-456:hud',
        expect.objectContaining({
          t: 'hud',
          mission_id: missionId,
          hud: hudData,
          full: true,
          ts: expect.any(Number),
        })
      );
    });

    it('should publish HUD update with phase data', async () => {
      const missionId = 'mission-789';
      const hudData: HudData = { phase: 'LAUNCH' };

      await realtimeService.publishHudUpdate(missionId, hudData, true);

      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-789:hud',
        expect.objectContaining({
          t: 'hud',
          mission_id: missionId,
          hud: { phase: 'LAUNCH' },
          full: true,
        })
      );
    });

    it('should throw error when realtime send fails', async () => {
      const missionId = 'mission-error';
      const hudData: HudData = { fuel: 50 };
      const error = new Error('Network error');

      mockRealtime.send.mockRejectedValueOnce(error);

      await expect(
        realtimeService.publishHudUpdate(missionId, hudData, false)
      ).rejects.toThrow('Network error');
    });
  });

  describe('publishTimerState', () => {
    it('should publish timer state for LAUNCH timer with running status', async () => {
      const missionId = 'mission-123';
      const timerKind: TimerKind = 'LAUNCH';
      const endsAt = new Date('2025-10-30T12:00:00Z');
      const status: TimerStatus = 'running';

      await realtimeService.publishTimerState(missionId, timerKind, endsAt, status);

      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-123:timer',
        expect.objectContaining({
          t: 'timer',
          mission_id: missionId,
          ts: expect.any(Number),
          timer: {
            kind: 'LAUNCH',
            ends_at: '2025-10-30T12:00:00.000Z',
            now: expect.any(String),
            status: 'running',
          },
        })
      );
    });

    it('should publish timer state for BALLOT timer with paused status', async () => {
      const missionId = 'mission-456';
      const timerKind: TimerKind = 'BALLOT';
      const endsAt = new Date('2025-10-30T15:30:00Z');
      const status: TimerStatus = 'paused';

      await realtimeService.publishTimerState(missionId, timerKind, endsAt, status);

      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-456:timer',
        expect.objectContaining({
          t: 'timer',
          mission_id: missionId,
          timer: {
            kind: 'BALLOT',
            ends_at: '2025-10-30T15:30:00.000Z',
            now: expect.any(String),
            status: 'paused',
          },
        })
      );
    });

    it('should publish timer state for PHASE timer with ended status', async () => {
      const missionId = 'mission-789';
      const timerKind: TimerKind = 'PHASE';
      const endsAt = new Date('2025-10-30T10:00:00Z');
      const status: TimerStatus = 'ended';

      await realtimeService.publishTimerState(missionId, timerKind, endsAt, status);

      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-789:timer',
        expect.objectContaining({
          t: 'timer',
          mission_id: missionId,
          timer: {
            kind: 'PHASE',
            ends_at: '2025-10-30T10:00:00.000Z',
            now: expect.any(String),
            status: 'ended',
          },
        })
      );
    });

    it('should throw error when realtime send fails', async () => {
      const missionId = 'mission-error';
      const timerKind: TimerKind = 'LAUNCH';
      const endsAt = new Date();
      const status: TimerStatus = 'running';
      const error = new Error('Connection timeout');

      mockRealtime.send.mockRejectedValueOnce(error);

      await expect(
        realtimeService.publishTimerState(missionId, timerKind, endsAt, status)
      ).rejects.toThrow('Connection timeout');
    });
  });

  describe('startCountdown', () => {
    it('should create PostData entry and publish timer start for LAUNCH countdown', async () => {
      const missionId = 'mission-123';
      const timerKind: TimerKind = 'LAUNCH';
      const durationMs = 60000; // 1 minute
      const schedulerJobName = 'launch-countdown-job';

      await realtimeService.startCountdown(
        missionId,
        timerKind,
        durationMs,
        schedulerJobName
      );

      // Verify PostData was updated
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'mission:mission-123:postdata',
        expect.objectContaining({
          launch_countdown_until: expect.any(String),
        })
      );

      // Verify scheduled job was created
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'mission:mission-123:scheduled_jobs',
        expect.objectContaining({
          [schedulerJobName]: expect.stringContaining('endsAt'),
        })
      );

      // Verify timer state was published
      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-123:timer',
        expect.objectContaining({
          t: 'timer',
          mission_id: missionId,
          timer: expect.objectContaining({
            kind: 'LAUNCH',
            status: 'running',
          }),
        })
      );
    });

    it('should create PostData entry for BALLOT countdown', async () => {
      const missionId = 'mission-456';
      const timerKind: TimerKind = 'BALLOT';
      const durationMs = 120000; // 2 minutes
      const schedulerJobName = 'ballot-countdown-job';

      await realtimeService.startCountdown(
        missionId,
        timerKind,
        durationMs,
        schedulerJobName
      );

      // Verify correct field was updated
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'mission:mission-456:postdata',
        expect.objectContaining({
          choices_open_until: expect.any(String),
        })
      );
    });

    it('should create PostData entry for PHASE countdown', async () => {
      const missionId = 'mission-789';
      const timerKind: TimerKind = 'PHASE';
      const durationMs = 180000; // 3 minutes
      const schedulerJobName = 'phase-countdown-job';

      await realtimeService.startCountdown(
        missionId,
        timerKind,
        durationMs,
        schedulerJobName
      );

      // Verify correct field was updated
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'mission:mission-789:postdata',
        expect.objectContaining({
          phase_gate_until: expect.any(String),
        })
      );
    });

    it('should throw error when Redis hSet fails', async () => {
      const missionId = 'mission-error';
      const timerKind: TimerKind = 'LAUNCH';
      const durationMs = 60000;
      const schedulerJobName = 'test-job';
      const error = new Error('Redis connection failed');

      mockRedis.hSet = vi.fn().mockRejectedValueOnce(error);

      await expect(
        realtimeService.startCountdown(missionId, timerKind, durationMs, schedulerJobName)
      ).rejects.toThrow('Redis connection failed');
    });
  });

  describe('pauseCountdown', () => {
    it('should update PostData and publish paused state', async () => {
      const missionId = 'mission-123';
      const timerKind: TimerKind = 'LAUNCH';
      const remainingMs = 30000; // 30 seconds

      await realtimeService.pauseCountdown(missionId, timerKind, remainingMs);

      // Verify PostData was updated
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'mission:mission-123:postdata',
        expect.objectContaining({
          launch_countdown_until: expect.any(String),
        })
      );

      // Verify paused state was published
      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-123:timer',
        expect.objectContaining({
          timer: expect.objectContaining({
            kind: 'LAUNCH',
            status: 'paused',
          }),
        })
      );
    });
  });

  describe('resumeCountdown', () => {
    it('should update PostData, reschedule job, and publish running state', async () => {
      const missionId = 'mission-123';
      const timerKind: TimerKind = 'BALLOT';
      const remainingMs = 45000; // 45 seconds
      const schedulerJobName = 'resume-job';

      await realtimeService.resumeCountdown(
        missionId,
        timerKind,
        remainingMs,
        schedulerJobName
      );

      // Verify PostData was updated
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'mission:mission-123:postdata',
        expect.objectContaining({
          choices_open_until: expect.any(String),
        })
      );

      // Verify scheduled job was created
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'mission:mission-123:scheduled_jobs',
        expect.objectContaining({
          [schedulerJobName]: expect.stringContaining('endsAt'),
        })
      );

      // Verify running state was published
      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-123:timer',
        expect.objectContaining({
          timer: expect.objectContaining({
            kind: 'BALLOT',
            status: 'running',
          }),
        })
      );
    });
  });

  describe('endCountdown', () => {
    it('should clear PostData and publish ended state', async () => {
      const missionId = 'mission-123';
      const timerKind: TimerKind = 'PHASE';

      await realtimeService.endCountdown(missionId, timerKind);

      // Verify PostData was cleared
      expect(mockRedis.hSet).toHaveBeenCalledWith(
        'mission:mission-123:postdata',
        expect.objectContaining({
          phase_gate_until: '',
        })
      );

      // Verify ended state was published
      expect(mockRealtime.send).toHaveBeenCalledWith(
        'rt:mission:mission-123:timer',
        expect.objectContaining({
          timer: expect.objectContaining({
            kind: 'PHASE',
            status: 'ended',
          }),
        })
      );
    });
  });
});
