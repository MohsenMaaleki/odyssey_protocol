import { useState, useEffect, useRef } from 'react';
import type { TimerMessage, TimerKind, TimerStatus } from '../../shared/types/realtime.js';

export interface TimerState {
  kind: TimerKind;
  remainingMs: number;
  status: TimerStatus;
  endsAt: Date | null;
}

export interface UseRealtimeTimerResult {
  timer: TimerState;
  isConnected: boolean;
  remainingSeconds: number;
}

/**
 * Hook for subscribing to realtime timer updates
 * Provides live countdown with drift correction and fallback support
 */
export function useRealtimeTimer(
  missionId: string,
  timerKind: TimerKind,
  fallbackEndsAt?: string | null
): UseRealtimeTimerResult {
  const [timer, setTimer] = useState<TimerState>({
    kind: timerKind,
    remainingMs: 0,
    status: 'ended',
    endsAt: null,
  });

  const [serverOffset, setServerOffset] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const channelRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);

  // Initialize from fallback if provided
  useEffect(() => {
    if (fallbackEndsAt && !isConnected) {
      const endsAt = new Date(fallbackEndsAt);
      const remaining = Math.max(0, endsAt.getTime() - Date.now());

      if (remaining > 0) {
        setTimer({
          kind: timerKind,
          remainingMs: remaining,
          status: 'running',
          endsAt,
        });
      }
    }
  }, [fallbackEndsAt, timerKind, isConnected]);

  // Local tick interval for smooth countdown
  useEffect(() => {
    if (timer.status !== 'running' || !timer.endsAt) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const now = Date.now() + serverOffset;
      const remaining = timer.endsAt!.getTime() - now;

      if (remaining <= 0) {
        setTimer((prev) => ({
          ...prev,
          remainingMs: 0,
          status: 'ended',
        }));
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setTimer((prev) => ({
          ...prev,
          remainingMs: remaining,
        }));
      }
    }, 100); // Update every 100ms for smooth animation

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.status, timer.endsAt, serverOffset]);

  // Realtime subscription
  useEffect(() => {
    const timestamp = new Date().toISOString();
    
    if (!window.devvit?.realtime) {
      console.warn(
        `[useRealtimeTimer] [${timestamp}] Realtime not available, using fallback mode for ${timerKind}`
      );
      return;
    }

    const topicName = `rt:mission:${missionId}:timer`;
    console.log(`[useRealtimeTimer] [${timestamp}] Subscribing to ${topicName} for ${timerKind}`);

    try {
      const channel = window.devvit.realtime.subscribe(
        topicName,
        (message: TimerMessage) => {
          const msgTimestamp = new Date().toISOString();
          
          // Only process messages for this timer kind
          if (message.timer.kind !== timerKind) {
            return;
          }

          console.log(
            `[useRealtimeTimer] [${msgTimestamp}] Received timer update for ${timerKind}:`,
            message
          );

          // Calculate drift correction
          if (message.timer.now) {
            const serverTime = new Date(message.timer.now).getTime();
            const localTime = Date.now();
            const offset = serverTime - localTime;
            setServerOffset(offset);
            console.log(`[useRealtimeTimer] [${msgTimestamp}] Drift correction: ${offset}ms`);
          }

          const endsAt = new Date(message.timer.ends_at);
          const now = Date.now() + serverOffset;
          const remaining = Math.max(0, endsAt.getTime() - now);

          setTimer({
            kind: message.timer.kind,
            remainingMs: remaining,
            status: message.timer.status,
            endsAt,
          });
        }
      );

      // Track connection state
      if (channel.onConnected) {
        channel.onConnected(() => {
          const connTimestamp = new Date().toISOString();
          console.log(
            `[useRealtimeTimer] [${connTimestamp}] Connected to ${topicName} for ${timerKind}`
          );
          setIsConnected(true);
        });
      }

      if (channel.onDisconnected) {
        channel.onDisconnected(() => {
          const disconnTimestamp = new Date().toISOString();
          console.log(
            `[useRealtimeTimer] [${disconnTimestamp}] Disconnected from ${topicName} for ${timerKind}`
          );
          setIsConnected(false);

          // Switch to fallback mode
          if (fallbackEndsAt) {
            try {
              const endsAt = new Date(fallbackEndsAt);
              const remaining = Math.max(0, endsAt.getTime() - Date.now());
              setTimer((prev) => ({
                ...prev,
                endsAt,
                remainingMs: remaining,
                status: remaining > 0 ? 'running' : 'ended',
              }));
              console.log(
                `[useRealtimeTimer] [${disconnTimestamp}] Switched to fallback mode for ${timerKind}`
              );
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error(
                `[useRealtimeTimer] [${disconnTimestamp}] Error switching to fallback:`,
                { error: errorMessage, fallbackEndsAt }
              );
            }
          }
        });
      }

      channelRef.current = channel;
      setIsConnected(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[useRealtimeTimer] [${timestamp}] Error subscribing to realtime:`,
        {
          error: errorMessage,
          missionId,
          timerKind,
          topicName,
        }
      );
    }

    return () => {
      if (channelRef.current?.unsubscribe) {
        const cleanupTimestamp = new Date().toISOString();
        console.log(
          `[useRealtimeTimer] [${cleanupTimestamp}] Unsubscribing from ${topicName} for ${timerKind}`
        );
        try {
          channelRef.current.unsubscribe();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `[useRealtimeTimer] [${cleanupTimestamp}] Error unsubscribing:`,
            { error: errorMessage }
          );
        }
      }
    };
  }, [missionId, timerKind, fallbackEndsAt, serverOffset]);

  const remainingSeconds = Math.ceil(timer.remainingMs / 1000);

  return { timer, isConnected, remainingSeconds };
}
