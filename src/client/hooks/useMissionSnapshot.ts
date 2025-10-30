import { useCallback } from 'react';
import type { MissionSnapshotResponse } from '../../shared/types/mission.js';
import type { HudState } from './useRealtimeHud.js';

export interface UseMissionSnapshotResult {
  fetchSnapshot: () => Promise<MissionSnapshotResponse | null>;
  syncFromSnapshot: (
    snapshot: MissionSnapshotResponse,
    setHud: (hud: HudState) => void
  ) => void;
}

/**
 * Hook for fetching and syncing mission snapshots
 * Used for cold-start and reconnection scenarios
 */
export function useMissionSnapshot(missionId: string): UseMissionSnapshotResult {
  const fetchSnapshot = useCallback(async (): Promise<MissionSnapshotResponse | null> => {
    try {
      console.log(`[useMissionSnapshot] Fetching snapshot for mission ${missionId}`);
      const response = await fetch(`/api/mission/snapshot?mission_id=${missionId}`);

      if (!response.ok) {
        console.error(`[useMissionSnapshot] Failed to fetch snapshot: ${response.status}`);
        return null;
      }

      const snapshot: MissionSnapshotResponse = await response.json();
      console.log(`[useMissionSnapshot] Snapshot received:`, snapshot);
      return snapshot;
    } catch (error) {
      console.error('[useMissionSnapshot] Error fetching snapshot:', error);
      return null;
    }
  }, [missionId]);

  const syncFromSnapshot = useCallback(
    (snapshot: MissionSnapshotResponse, setHud: (hud: HudState) => void) => {
      console.log(`[useMissionSnapshot] Syncing from snapshot`);

      // Update HUD state
      setHud({
        fuel: snapshot.fuel,
        hull: snapshot.hull,
        crew: snapshot.crew,
        success: snapshot.success,
        scienceDelta: snapshot.science_points_delta,
        phase: snapshot.phase,
      });

      // Note: Timer states are handled by useRealtimeTimer hook
      // which will use the fallback timestamps from the snapshot
    },
    []
  );

  return { fetchSnapshot, syncFromSnapshot };
}
