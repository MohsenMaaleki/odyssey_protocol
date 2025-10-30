/**
 * Unlock system type definitions
 * Shared between client and server for type safety
 */

/**
 * Effect modifiers applied by unlocks
 */
export interface UnlockEffect {
  successChance?: number;
  morale?: number;
  maxFuel?: number;
  scienceBonus?: number;
}

/**
 * Individual unlock node in the tech tree
 */
export interface UnlockNode {
  id: string;
  type: 'part' | 'mission' | 'bonus';
  cost: number;
  label: string;
  description?: string;
  prereq: string[];
  effect?: UnlockEffect;
}

/**
 * Complete unlock tree structure
 */
export interface UnlockTree {
  nodes: UnlockNode[];
  edges: [string, string][];
}

/**
 * User's unlock status and progress
 */
export interface UnlockStatus {
  total_science_points: number;
  unlocks: string[];
  unlock_meta: {
    season: number;
    tree_version: number;
    purchased_at: Record<string, string>;
  };
}

/**
 * Result of an unlock purchase attempt
 */
export interface PurchaseResult {
  ok: boolean;
  message: string;
  new_sp?: number;
  unlock_id?: string;
  required?: number;
  available?: number;
  missing_prereqs?: string[];
}

/**
 * Result of a season reset operation
 */
export interface SeasonResetResult {
  ok: boolean;
  season?: number;
  message: string;
}

/**
 * API Request Types
 */
export interface PurchaseUnlockRequest {
  id: string;
}

/**
 * API Response Types
 */
export interface GetTreeResponse {
  tree: UnlockTree;
  status: UnlockStatus;
}
