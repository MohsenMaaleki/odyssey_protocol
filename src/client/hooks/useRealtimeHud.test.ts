import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeHud } from './useRealtimeHud';
import type { HudMessage } from '../../shared/types/realtime';

/**
 * Unit tests for useRealtimeHud hook
 * Tests HUD state updates, stale message filtering, and connection state tracking
 */

// Mock realtime channel
class MockRealtimeChannel {
  private connectedHandler: (() => void) | null = null;
  private disconnectedHandler: (() => void) | null = null;

  constructor(private messageHandler: (message: HudMessage) => void) {}

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
  simulateMessage(message: HudMessage): void {
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

describe('useRealtimeHud', () => {
  let mockChannel: MockRealtimeChannel | null = null;
  let mockRealtime: any;

  beforeEach(() => {
    mockRealtime = {
      subscribe: vi.fn((topic: string, handler: (message: HudMessage) => void) => {
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

  describe('HUD state updates on message receipt', () => {
    it('should update HUD state when receiving a message', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      // Initial state
      expect(result.current.hud).toEqual(initialState);

      // Simulate HUD update message
      const message: HudMessage = {
        t: 'hud',
        mission_id: 'mission-001',
        ts: Date.now(),
        hud: {
          fuel: 90,
          hull: 95,
        },
      };

      act(() => {
        mockChannel!.simulateMessage(message);
      });

      // Verify state updated
      expect(result.current.hud.fuel).toBe(90);
      expect(result.current.hud.hull).toBe(95);
      expect(result.current.hud.crew).toBe(100); // Unchanged
      expect(result.current.hud.success).toBe(50); // Unchanged
    });

    it('should merge partial HUD updates with existing state', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      // First update
      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: Date.now(),
          hud: { fuel: 80 },
        });
      });

      expect(result.current.hud.fuel).toBe(80);
      expect(result.current.hud.hull).toBe(100);

      // Second update
      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: Date.now() + 100,
          hud: { hull: 70, crew: 90 },
        });
      });

      expect(result.current.hud.fuel).toBe(80); // Preserved from first update
      expect(result.current.hud.hull).toBe(70);
      expect(result.current.hud.crew).toBe(90);
    });

    it('should handle full HUD snapshot updates', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      // Full snapshot update
      const message: HudMessage = {
        t: 'hud',
        mission_id: 'mission-001',
        ts: Date.now(),
        hud: {
          fuel: 60,
          hull: 70,
          crew: 80,
          success: 90,
          scienceDelta: 5,
          phase: 'LAUNCH',
        },
        full: true,
      };

      act(() => {
        mockChannel!.simulateMessage(message);
      });

      expect(result.current.hud).toEqual({
        fuel: 60,
        hull: 70,
        crew: 80,
        success: 90,
        scienceDelta: 5,
        phase: 'LAUNCH',
      });
    });
  });

  describe('Stale message filtering', () => {
    it('should ignore messages with older timestamps', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      const now = Date.now();

      // First message with newer timestamp
      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: now + 1000,
          hud: { fuel: 80 },
        });
      });

      expect(result.current.hud.fuel).toBe(80);

      // Second message with older timestamp (should be ignored)
      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: now,
          hud: { fuel: 50 },
        });
      });

      expect(result.current.hud.fuel).toBe(80); // Should remain unchanged
    });

    it('should process messages with equal timestamps', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      const now = Date.now();

      // First message
      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: now,
          hud: { fuel: 80 },
        });
      });

      expect(result.current.hud.fuel).toBe(80);

      // Second message with same timestamp (should be ignored based on <= check)
      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: now,
          hud: { fuel: 60 },
        });
      });

      expect(result.current.hud.fuel).toBe(80); // Should remain unchanged
    });

    it('should process messages in chronological order', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      const baseTime = Date.now();

      // Send messages in chronological order
      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: baseTime + 100,
          hud: { fuel: 90 },
        });
      });

      expect(result.current.hud.fuel).toBe(90);

      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: baseTime + 200,
          hud: { fuel: 80 },
        });
      });

      expect(result.current.hud.fuel).toBe(80);

      act(() => {
        mockChannel!.simulateMessage({
          t: 'hud',
          mission_id: 'mission-001',
          ts: baseTime + 300,
          hud: { fuel: 70 },
        });
      });

      expect(result.current.hud.fuel).toBe(70);
    });
  });

  describe('Connection state tracking', () => {
    it('should track connection state as connected', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      // Initially connected (hook assumes connected on subscribe)
      expect(result.current.isConnected).toBe(true);

      // Simulate connection callback
      act(() => {
        mockChannel!.simulateConnected();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should track connection state as disconnected', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      // Initially connected
      expect(result.current.isConnected).toBe(true);

      // Then disconnect
      act(() => {
        mockChannel!.simulateDisconnected();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should handle multiple connection state changes', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      // Initially connected
      expect(result.current.isConnected).toBe(true);

      // Disconnect
      act(() => {
        mockChannel!.simulateDisconnected();
      });
      expect(result.current.isConnected).toBe(false);

      // Reconnect
      act(() => {
        mockChannel!.simulateConnected();
      });
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Fallback mode when realtime unavailable', () => {
    it('should handle missing realtime API gracefully', () => {
      // Remove realtime from window
      (global as any).window = {
        devvit: {},
      };

      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { result } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      // Should use initial state
      expect(result.current.hud).toEqual(initialState);
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Cleanup on unmount', () => {
    it('should unsubscribe from channel on unmount', () => {
      const initialState = {
        fuel: 100,
        hull: 100,
        crew: 100,
        success: 50,
        scienceDelta: 0,
        phase: 'DESIGN',
      };

      const { unmount } = renderHook(() =>
        useRealtimeHud('mission-001', initialState)
      );

      const unsubscribeSpy = vi.spyOn(mockChannel!, 'unsubscribe');

      unmount();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
