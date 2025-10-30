import { useEffect, useRef } from 'react';
import type { HudState } from './useRealtimeHud.js';
import type { MissionTimers } from '../../shared/types/mission.js';

export interface UseFallbackPollingProps {
  missionId: string;
  isRealtimeConnected: boolean;
  onHudUpdate: (hud: HudState) => void;
  onTimersUpdate: (timers: MissionTimers) => void;
  pollingInterval?: number; // milliseconds
}

/**
 * Hook for fallback polling when realtime is unavailable
 * Periodically fetches mission snapshot to keep UI updated
 */
export function useFallbackPolling({
  missionId,
  isRealtimeConnected,
  onHudUpdate,
  onTimersUpdate,
  pollingInterval = 5000, // 5 seconds default
}: UseFallbackPollingProps): void {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Only poll when realtime is not connected
    if (isRealtimeConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log('[useFallbackPolling] Starting fallback polling');

    // Fetch snapshot immediately
    const fetchSnapshot = async () => {
      try {
        const response = await fetch(`/api/mission/snapshot?mission_id=${missionId}`);
        if (!response.ok) {
          console.error('[useFallbackPolling] Failed to fetch snapshot:', response.status);
          return;
        }

        const snapshot = await response.json();
        console.log('[useFallbackPolling] Snapshot fetched:', snapshot);

        // Update HUD
        onHudUpdate({
          fuel: snapshot.fuel,
          hull: snapshot.hull,
          crew: snapshot.crew,
          success: snapshot.success,
          scienceDelta: snapshot.science_points_delta,
          phase: snapshot.phase,
        });

        // Update timers
        onTimersUpdate(snapshot.timers);
      } catch (error) {
        console.error('[useFallbackPolling] Error fetching snapshot:', error);
      }
    };

    // Fetch immediately
    fetchSnapshot();

    // Set up polling interval
    intervalRef.current = window.setInterval(fetchSnapshot, pollingInterval);

    return () => {
      if (intervalRef.current) {
        console.log('[useFallbackPolling] Stopping fallback polling');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [missionId, isRealtimeConnected, onHudUpdate, onTimersUpdate, pollingInterval]);
}
