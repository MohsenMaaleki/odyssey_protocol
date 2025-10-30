import { useState, useEffect, useRef } from 'react';
import type { HudMessage } from '../../shared/types/realtime.js';

export interface HudState {
  fuel: number;
  hull: number;
  crew: number;
  success: number;
  scienceDelta: number;
  phase: string;
}

export interface UseRealtimeHudResult {
  hud: HudState;
  isConnected: boolean;
  lastUpdate: number;
}

/**
 * Hook for subscribing to realtime HUD updates
 * Provides live mission statistics with graceful degradation
 */
export function useRealtimeHud(
  missionId: string,
  initialState: HudState
): UseRealtimeHudResult {
  const [hud, setHud] = useState<HudState>(initialState);
  const [lastTs, setLastTs] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const timestamp = new Date().toISOString();
    
    // Check if realtime is available
    if (!window.devvit?.realtime) {
      console.warn(`[useRealtimeHud] [${timestamp}] Realtime not available, using fallback mode`);
      return;
    }

    const topicName = `rt:mission:${missionId}:hud`;
    console.log(`[useRealtimeHud] [${timestamp}] Subscribing to ${topicName}`);

    try {
      // Subscribe to HUD updates
      const channel = window.devvit.realtime.subscribe(
        topicName,
        (message: HudMessage) => {
          const msgTimestamp = new Date().toISOString();
          
          // Ignore stale messages
          if (message.ts <= lastTs) {
            console.log(
              `[useRealtimeHud] [${msgTimestamp}] Ignoring stale message (ts: ${message.ts}, lastTs: ${lastTs})`
            );
            return;
          }

          console.log(`[useRealtimeHud] [${msgTimestamp}] Received HUD update:`, message);
          setLastTs(message.ts);
          setLastUpdate(Date.now());

          // Update HUD state
          setHud((prev) => ({
            ...prev,
            ...message.hud,
          }));
        }
      );

      // Track connection state
      if (channel.onConnected) {
        channel.onConnected(async () => {
          const connTimestamp = new Date().toISOString();
          console.log(`[useRealtimeHud] [${connTimestamp}] Connected to ${topicName}`);
          setIsConnected(true);

          // Request snapshot on reconnection to sync state
          try {
            const response = await fetch(`/api/mission/snapshot?mission_id=${missionId}`);
            if (response.ok) {
              const snapshot = await response.json();
              console.log(`[useRealtimeHud] [${connTimestamp}] Synced from snapshot on reconnection`);
              setHud({
                fuel: snapshot.fuel,
                hull: snapshot.hull,
                crew: snapshot.crew,
                success: snapshot.success,
                scienceDelta: snapshot.science_points_delta,
                phase: snapshot.phase,
              });
              setLastUpdate(Date.now());
            } else {
              console.error(
                `[useRealtimeHud] [${connTimestamp}] Failed to fetch snapshot: ${response.status} ${response.statusText}`
              );
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(
              `[useRealtimeHud] [${connTimestamp}] Failed to fetch snapshot on reconnection:`,
              {
                error: errorMessage,
                missionId,
              }
            );
          }
        });
      }

      if (channel.onDisconnected) {
        channel.onDisconnected(() => {
          const disconnTimestamp = new Date().toISOString();
          console.log(`[useRealtimeHud] [${disconnTimestamp}] Disconnected from ${topicName}`);
          setIsConnected(false);
        });
      }

      channelRef.current = channel;

      // Assume connected initially
      setIsConnected(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[useRealtimeHud] [${timestamp}] Error subscribing to realtime:`,
        {
          error: errorMessage,
          missionId,
          topicName,
        }
      );
    }

    return () => {
      if (channelRef.current?.unsubscribe) {
        const cleanupTimestamp = new Date().toISOString();
        console.log(`[useRealtimeHud] [${cleanupTimestamp}] Unsubscribing from ${topicName}`);
        try {
          channelRef.current.unsubscribe();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `[useRealtimeHud] [${cleanupTimestamp}] Error unsubscribing:`,
            { error: errorMessage }
          );
        }
      }
    };
  }, [missionId, lastTs]);

  return { hud, isConnected, lastUpdate };
}
