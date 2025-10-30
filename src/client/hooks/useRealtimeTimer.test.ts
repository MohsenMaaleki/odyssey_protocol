import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeTimer } from './useRealtimeTimer';
import type { TimerMessage } from '../../shared/types/realtime';

/**
 * Unit tests for useRealtimeTimer hook
 * Tests drift correction, local tick updates, fallback mode, and pause/resume handling
 */

// Mock realtime channel
class MockRealtimeChannel {
  private connectedHandler: (() => void) | null = null;
  private disconnectedHandler: (() => void) | null = null;

  constructor(private messageHandler: (message: TimerMessage) => void) {}

  onConnected(handler: () => void): void {
    this.connectedHandler = handler;
  }

  onDisconnected(handler: () => void): void {
    this.disconnectedHandler = handler;
  }

  unsubscribe(): void {
    this.connectedHandler = null;
    this.disconnectedHandler = null;
  }

  // Test helpers
  simulateMessage(message: TimerMessage): void {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  }

  simulateConnected(): void {
    if (this.connectedHandler) {
      this.connectedHandler();
    }
  }

  simulateDisconnected(): void {
    if (this.disconnectedHandler) {
      this.disconnectedHandler();
    }
  }
}

describe('useRealtimeTimer', () => {
  let mockChannel: MockRealtimeChannel | null = null;
  let mockRealtime: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockRealtime = {
      subscribe: vi.fn((topic: string, handler: (message: TimerMessage) => void) => {
        mockChannel = new MockRealtimeChannel(handler);
        return mockChannel;
      }),
    };

    // Mock window.devvit
    (global as any).window = {
      devvit: {
        realtime: mockRealtime,
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Drift correction calculation', () => {
    it('should calculate server offset from timer message', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const serverTime = new Date('2025-01-01T12:00:00Z');
      const endsAt = new Date('2025-01-01T12:05:00Z');

      // Mock Date.now to return a specific time
      const mockNow = serverTime.getTime() - 5000; // Client is 5 seconds behind
      vi.setSystemTime(mockNow);

      const message: TimerMessage = {
        t: 'timer',
        mission_id: 'mission-001',
        ts: Date.now(),
        timer: {
          kind: 'LAUNCH',
          ends_at: endsAt.toISOString(),
          now: serverTime.toISOString(),
          status: 'running',
        },
      };

      act(() => {
        mockChannel!.simulateMessage(message);
      });

      // Timer should account for the 5-second offset
      // Remaining time should be 5 minutes (300000ms)
      expect(result.current.timer.remainingMs).toBe(300000);
      expect(result.current.timer.status).toBe('running');
    });

    it('should update drift correction on subsequent messages', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const baseTime = new Date('2025-01-01T12:00:00Z').getTime();

      // First message with 5-second offset
      vi.setSystemTime(baseTime - 5000);
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: new Date(baseTime + 60000).toISOString(),
            now: new Date(baseTime).toISOString(),
            status: 'running',
          },
        });
      });

      expect(result.current.timer.remainingMs).toBe(60000);

      // Second message with 10-second offset
      vi.setSystemTime(baseTime + 10000 - 10000); // Still at baseTime, but offset changes
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: new Date(baseTime + 60000).toISOString(),
            now: new Date(baseTime + 10000).toISOString(),
            status: 'running',
          },
        });
      });

      // Should recalculate with new offset
      expect(result.current.timer.remainingMs).toBe(50000);
    });

    it('should handle messages without server time', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 60000);

      const message: TimerMessage = {
        t: 'timer',
        mission_id: 'mission-001',
        ts: Date.now(),
        timer: {
          kind: 'LAUNCH',
          ends_at: endsAt.toISOString(),
          status: 'running',
        },
      };

      act(() => {
        mockChannel!.simulateMessage(message);
      });

      // Should use local time without offset
      expect(result.current.timer.status).toBe('running');
      expect(result.current.timer.remainingMs).toBeGreaterThan(59000);
      expect(result.current.timer.remainingMs).toBeLessThanOrEqual(60000);
    });
  });

  describe('Local tick updates', () => {
    it('should update remaining time every 100ms', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 10000); // 10 seconds from now

      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      const initialRemaining = result.current.timer.remainingMs;
      expect(initialRemaining).toBeGreaterThan(9000);

      // Advance time by 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.timer.remainingMs).toBeLessThan(initialRemaining);
      expect(result.current.timer.remainingMs).toBeGreaterThan(9800);
    });

    it('should stop ticking when timer reaches zero', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 500); // 500ms from now

      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      expect(result.current.timer.status).toBe('running');

      // Advance time past the deadline
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.timer.remainingMs).toBe(0);
      expect(result.current.timer.status).toBe('ended');
    });

    it('should not go below zero remaining time', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 200);

      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      // Advance time well past the deadline
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.timer.remainingMs).toBe(0);
      expect(result.current.timer.remainingMs).toBeGreaterThanOrEqual(0);
    });

    it('should not tick when timer is paused', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 10000);

      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'paused',
          },
        });
      });

      const remainingBeforeTick = result.current.timer.remainingMs;

      // Advance time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Remaining time should not change when paused
      expect(result.current.timer.remainingMs).toBe(remainingBeforeTick);
    });

    it('should not tick when timer is ended', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 10000);

      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'ended',
          },
        });
      });

      const remainingBeforeTick = result.current.timer.remainingMs;

      // Advance time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Remaining time should not change when ended
      expect(result.current.timer.remainingMs).toBe(remainingBeforeTick);
    });
  });

  describe('Fallback mode behavior', () => {
    it('should use fallback timestamp when realtime unavailable', () => {
      // Remove realtime from window
      (global as any).window = {
        devvit: {},
      };

      const fallbackEndsAt = new Date(Date.now() + 60000).toISOString();

      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH', fallbackEndsAt)
      );

      // Should use fallback timestamp
      expect(result.current.timer.status).toBe('running');
      expect(result.current.timer.remainingMs).toBeGreaterThan(59000);
      expect(result.current.timer.remainingMs).toBeLessThanOrEqual(60000);
    });

    it('should handle missing fallback timestamp gracefully', () => {
      // Remove realtime from window
      (global as any).window = {
        devvit: {},
      };

      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH', null)
      );

      // Should have ended status with no timer
      expect(result.current.timer.status).toBe('ended');
      expect(result.current.timer.remainingMs).toBe(0);
    });

    it('should switch to fallback on disconnection', () => {
      const fallbackEndsAt = new Date(Date.now() + 60000).toISOString();

      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH', fallbackEndsAt)
      );

      // Start with realtime
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: new Date(Date.now() + 30000).toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      expect(result.current.timer.remainingMs).toBeGreaterThan(29000);

      // Simulate disconnection
      act(() => {
        mockChannel!.simulateDisconnected();
      });

      expect(result.current.isConnected).toBe(false);
      // Should switch to fallback timestamp
      expect(result.current.timer.remainingMs).toBeGreaterThan(59000);
    });
  });

  describe('Pause/resume state handling', () => {
    it('should handle pause state', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 60000);

      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'paused',
          },
        });
      });

      expect(result.current.timer.status).toBe('paused');
      expect(result.current.timer.endsAt).toEqual(endsAt);
    });

    it('should handle resume from pause', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 60000);

      // Start paused
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'paused',
          },
        });
      });

      expect(result.current.timer.status).toBe('paused');
      const pausedRemaining = result.current.timer.remainingMs;

      // Advance time while paused
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should not change while paused
      expect(result.current.timer.remainingMs).toBe(pausedRemaining);

      // Resume
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      expect(result.current.timer.status).toBe('running');

      // Should now tick
      const runningRemaining = result.current.timer.remainingMs;
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.timer.remainingMs).toBeLessThan(runningRemaining);
    });

    it('should handle ended state', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() - 1000); // Already passed

      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'ended',
          },
        });
      });

      expect(result.current.timer.status).toBe('ended');
      expect(result.current.timer.remainingMs).toBe(0);
    });

    it('should transition from running to paused to ended', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const endsAt = new Date(Date.now() + 60000);

      // Start running
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      expect(result.current.timer.status).toBe('running');

      // Pause
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'paused',
          },
        });
      });

      expect(result.current.timer.status).toBe('paused');

      // End
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: endsAt.toISOString(),
            now: new Date().toISOString(),
            status: 'ended',
          },
        });
      });

      expect(result.current.timer.status).toBe('ended');
    });
  });

  describe('Timer kind filtering', () => {
    it('should only process messages for matching timer kind', () => {
      const { result } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      // Send BALLOT timer message (should be ignored)
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'BALLOT',
            ends_at: new Date(Date.now() + 30000).toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      expect(result.current.timer.status).toBe('ended'); // Should remain in initial state

      // Send LAUNCH timer message (should be processed)
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: new Date(Date.now() + 60000).toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      expect(result.current.timer.status).toBe('running');
      expect(result.current.timer.remainingMs).toBeGreaterThan(59000);
    });
  });

  describe('Cleanup on unmount', () => {
    it('should unsubscribe from channel on unmount', () => {
      const { unmount } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      const unsubscribeSpy = vi.spyOn(mockChannel!, 'unsubscribe');

      unmount();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should clear interval on unmount', () => {
      const { unmount } = renderHook(() =>
        useRealtimeTimer('mission-001', 'LAUNCH')
      );

      // Start a timer
      act(() => {
        mockChannel!.simulateMessage({
          t: 'timer',
          mission_id: 'mission-001',
          ts: Date.now(),
          timer: {
            kind: 'LAUNCH',
            ends_at: new Date(Date.now() + 60000).toISOString(),
            now: new Date().toISOString(),
            status: 'running',
          },
        });
      });

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
