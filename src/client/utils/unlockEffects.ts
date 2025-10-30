/**
 * Utility functions for calculating and applying unlock effects to gameplay
 * Aggregates effects from all purchased unlocks and applies them to missions
 */

import type { UnlockTree, UnlockStatus, UnlockEffect } from '../../shared/types/unlock';

/**
 * Aggregate all active effects from purchased unlocks
 * Returns cumulative effects from all unlocked items
 */
export function calculateActiveEffects(
  tree: UnlockTree | null,
  status: UnlockStatus | null
): UnlockEffect {
  if (!tree || !status) {
    return {
      successChance: 0,
      morale: 0,
      maxFuel: 0,
      scienceBonus: 0,
    };
  }

  const activeEffects: UnlockEffect = {
    successChance: 0,
    morale: 0,
    maxFuel: 0,
    scienceBonus: 0,
  };

  // Iterate through all purchased unlocks
  for (const unlockId of status.unlocks) {
    const node = tree.nodes.find((n) => n.id === unlockId);
    if (!node || !node.effect) continue;

    // Accumulate effects
    if (node.effect.successChance) {
      activeEffects.successChance! += node.effect.successChance;
    }
    if (node.effect.morale) {
      activeEffects.morale! += node.effect.morale;
    }
    if (node.effect.maxFuel) {
      activeEffects.maxFuel! += node.effect.maxFuel;
    }
    if (node.effect.scienceBonus) {
      activeEffects.scienceBonus! += node.effect.scienceBonus;
    }
  }

  return activeEffects;
}

/**
 * Calculate effects from specific parts used in ship design
 * Returns cumulative effects from the selected parts
 */
export function calculatePartEffects(
  partIds: string[],
  tree: UnlockTree | null
): UnlockEffect {
  if (!tree) {
    return {
      successChance: 0,
      morale: 0,
      maxFuel: 0,
      scienceBonus: 0,
    };
  }

  const partEffects: UnlockEffect = {
    successChance: 0,
    morale: 0,
    maxFuel: 0,
    scienceBonus: 0,
  };

  // Iterate through selected parts
  for (const partId of partIds) {
    const node = tree.nodes.find((n) => n.id === partId && n.type === 'part');
    if (!node || !node.effect) continue;

    // Accumulate effects
    if (node.effect.successChance) {
      partEffects.successChance! += node.effect.successChance;
    }
    if (node.effect.morale) {
      partEffects.morale! += node.effect.morale;
    }
    if (node.effect.maxFuel) {
      partEffects.maxFuel! += node.effect.maxFuel;
    }
    if (node.effect.scienceBonus) {
      partEffects.scienceBonus! += node.effect.scienceBonus;
    }
  }

  return partEffects;
}

/**
 * Calculate effects from bonus unlocks only
 * Returns cumulative effects from purchased bonus unlocks
 */
export function calculateBonusEffects(
  tree: UnlockTree | null,
  status: UnlockStatus | null
): UnlockEffect {
  if (!tree || !status) {
    return {
      successChance: 0,
      morale: 0,
      maxFuel: 0,
      scienceBonus: 0,
    };
  }

  const bonusEffects: UnlockEffect = {
    successChance: 0,
    morale: 0,
    maxFuel: 0,
    scienceBonus: 0,
  };

  // Iterate through purchased bonus unlocks
  for (const unlockId of status.unlocks) {
    const node = tree.nodes.find((n) => n.id === unlockId && n.type === 'bonus');
    if (!node || !node.effect) continue;

    // Accumulate effects
    if (node.effect.successChance) {
      bonusEffects.successChance! += node.effect.successChance;
    }
    if (node.effect.morale) {
      bonusEffects.morale! += node.effect.morale;
    }
    if (node.effect.maxFuel) {
      bonusEffects.maxFuel! += node.effect.maxFuel;
    }
    if (node.effect.scienceBonus) {
      bonusEffects.scienceBonus! += node.effect.scienceBonus;
    }
  }

  return bonusEffects;
}

/**
 * Apply success chance modifier to a base success chance
 */
export function applySuccessChanceModifier(
  baseSuccessChance: number,
  modifier: number
): number {
  const modified = baseSuccessChance + modifier;
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, modified));
}

/**
 * Apply morale modifier to base morale
 */
export function applyMoraleModifier(baseMorale: number, modifier: number): number {
  const modified = baseMorale + modifier;
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, modified));
}

/**
 * Apply fuel modifier to base fuel capacity
 */
export function applyFuelModifier(baseFuel: number, modifier: number): number {
  const modified = baseFuel + modifier;
  // Ensure non-negative
  return Math.max(0, modified);
}

/**
 * Apply science bonus to base science points
 * Bonus is a percentage increase (e.g., 25 = +25%)
 */
export function applyScienceBonus(baseSciencePoints: number, bonusPercent: number): number {
  const bonus = (baseSciencePoints * bonusPercent) / 100;
  return Math.floor(baseSciencePoints + bonus);
}

/**
 * Calculate total mission stats with all unlock effects applied
 * Combines part effects and bonus effects
 */
export interface MissionStats {
  successChance: number;
  morale: number;
  maxFuel: number;
  sciencePoints: number;
}

export function calculateMissionStats(
  baseStats: MissionStats,
  selectedParts: string[],
  tree: UnlockTree | null,
  status: UnlockStatus | null
): MissionStats {
  // Get effects from selected parts
  const partEffects = calculatePartEffects(selectedParts, tree);

  // Get effects from bonus unlocks
  const bonusEffects = calculateBonusEffects(tree, status);

  // Combine all effects
  const totalSuccessModifier = (partEffects.successChance || 0) + (bonusEffects.successChance || 0);
  const totalMoraleModifier = (partEffects.morale || 0) + (bonusEffects.morale || 0);
  const totalFuelModifier = (partEffects.maxFuel || 0) + (bonusEffects.maxFuel || 0);
  const totalScienceBonus = (partEffects.scienceBonus || 0) + (bonusEffects.scienceBonus || 0);

  return {
    successChance: applySuccessChanceModifier(baseStats.successChance, totalSuccessModifier),
    morale: applyMoraleModifier(baseStats.morale, totalMoraleModifier),
    maxFuel: applyFuelModifier(baseStats.maxFuel, totalFuelModifier),
    sciencePoints: applyScienceBonus(baseStats.sciencePoints, totalScienceBonus),
  };
}

/**
 * Get a summary of active effects for display
 */
export function getEffectsSummary(
  tree: UnlockTree | null,
  status: UnlockStatus | null
): string[] {
  const effects = calculateActiveEffects(tree, status);
  const summary: string[] = [];

  if (effects.successChance && effects.successChance !== 0) {
    summary.push(
      `${effects.successChance > 0 ? '+' : ''}${effects.successChance}% Success Chance`
    );
  }
  if (effects.morale && effects.morale !== 0) {
    summary.push(`${effects.morale > 0 ? '+' : ''}${effects.morale} Morale`);
  }
  if (effects.maxFuel && effects.maxFuel !== 0) {
    summary.push(`${effects.maxFuel > 0 ? '+' : ''}${effects.maxFuel} Max Fuel`);
  }
  if (effects.scienceBonus && effects.scienceBonus !== 0) {
    summary.push(`${effects.scienceBonus > 0 ? '+' : ''}${effects.scienceBonus}% Science Points`);
  }

  return summary;
}
