/**
 * Utility functions for filtering game content based on unlock status
 * Used to gate ship parts, missions, and other content behind unlocks
 */

import type { UnlockTree, UnlockStatus } from '../../shared/types/unlock';

/**
 * Check if a specific unlock is purchased
 */
export function isUnlocked(unlockId: string, status: UnlockStatus | null): boolean {
  if (!status) return false;
  return status.unlocks.includes(unlockId);
}

/**
 * Get all unlocked parts of a specific type
 */
export function getUnlockedParts(
  tree: UnlockTree | null,
  status: UnlockStatus | null,
  partType?: 'part' | 'mission' | 'bonus'
): string[] {
  if (!tree || !status) return [];

  return tree.nodes
    .filter((node) => {
      // Filter by type if specified
      if (partType && node.type !== partType) return false;
      // Check if unlocked
      return status.unlocks.includes(node.id);
    })
    .map((node) => node.id);
}

/**
 * Filter available engines based on unlock status
 * Returns list of engine IDs that are unlocked
 */
export function getAvailableEngines(
  tree: UnlockTree | null,
  status: UnlockStatus | null
): string[] {
  if (!tree || !status) return [];

  return tree.nodes
    .filter((node) => {
      // Only engine parts
      if (node.type !== 'part' || !node.id.startsWith('engine_')) return false;
      // Check if unlocked
      return status.unlocks.includes(node.id);
    })
    .map((node) => node.id);
}

/**
 * Filter available fuel tanks based on unlock status
 * Returns list of fuel tank IDs that are unlocked
 */
export function getAvailableFuelTanks(
  tree: UnlockTree | null,
  status: UnlockStatus | null
): string[] {
  if (!tree || !status) return [];

  return tree.nodes
    .filter((node) => {
      // Only fuel tank parts
      if (node.type !== 'part' || !node.id.startsWith('tank_')) return false;
      // Check if unlocked
      return status.unlocks.includes(node.id);
    })
    .map((node) => node.id);
}

/**
 * Check if a ship part (engine, fuel tank, etc.) is available for use
 */
export function isPartAvailable(
  partId: string,
  tree: UnlockTree | null,
  status: UnlockStatus | null
): boolean {
  if (!tree || !status) return false;

  const node = tree.nodes.find((n) => n.id === partId);
  if (!node || node.type !== 'part') return false;

  return status.unlocks.includes(partId);
}

/**
 * Get the unlock requirement for a locked part
 * Returns the unlock node that needs to be purchased, or null if already unlocked
 */
export function getPartUnlockRequirement(
  partId: string,
  tree: UnlockTree | null,
  status: UnlockStatus | null
): { id: string; label: string; cost: number } | null {
  if (!tree || !status) return null;

  const node = tree.nodes.find((n) => n.id === partId);
  if (!node) return null;

  // Already unlocked
  if (status.unlocks.includes(partId)) return null;

  return {
    id: node.id,
    label: node.label,
    cost: node.cost,
  };
}

/**
 * Get display label for a part from the unlock tree
 */
export function getPartLabel(partId: string, tree: UnlockTree | null): string {
  if (!tree) return partId;

  const node = tree.nodes.find((n) => n.id === partId);
  return node?.label || partId;
}

/**
 * Get part description from the unlock tree
 */
export function getPartDescription(partId: string, tree: UnlockTree | null): string | undefined {
  if (!tree) return undefined;

  const node = tree.nodes.find((n) => n.id === partId);
  return node?.description;
}

/**
 * Filter available missions based on unlock status
 * Returns list of mission IDs that are unlocked
 */
export function getAvailableMissions(
  tree: UnlockTree | null,
  status: UnlockStatus | null
): string[] {
  if (!tree || !status) return [];

  return tree.nodes
    .filter((node) => {
      // Only mission nodes
      if (node.type !== 'mission') return false;
      // Check if unlocked
      return status.unlocks.includes(node.id);
    })
    .map((node) => node.id);
}

/**
 * Check if a mission is available for selection
 */
export function isMissionAvailable(
  missionId: string,
  tree: UnlockTree | null,
  status: UnlockStatus | null
): boolean {
  if (!tree || !status) return false;

  const node = tree.nodes.find((n) => n.id === missionId);
  if (!node || node.type !== 'mission') return false;

  return status.unlocks.includes(missionId);
}

/**
 * Get the unlock requirement for a locked mission
 * Returns the unlock node that needs to be purchased, or null if already unlocked
 */
export function getMissionUnlockRequirement(
  missionId: string,
  tree: UnlockTree | null,
  status: UnlockStatus | null
): { id: string; label: string; cost: number } | null {
  if (!tree || !status) return null;

  const node = tree.nodes.find((n) => n.id === missionId);
  if (!node) return null;

  // Already unlocked
  if (status.unlocks.includes(missionId)) return null;

  return {
    id: node.id,
    label: node.label,
    cost: node.cost,
  };
}

/**
 * Get display label for a mission from the unlock tree
 */
export function getMissionLabel(missionId: string, tree: UnlockTree | null): string {
  if (!tree) return missionId;

  const node = tree.nodes.find((n) => n.id === missionId);
  return node?.label || missionId;
}

/**
 * Get mission description from the unlock tree
 */
export function getMissionDescription(
  missionId: string,
  tree: UnlockTree | null
): string | undefined {
  if (!tree) return undefined;

  const node = tree.nodes.find((n) => n.id === missionId);
  return node?.description;
}
