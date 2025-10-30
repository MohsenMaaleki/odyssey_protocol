/**
 * Hook for accessing unlock effects in components
 * Provides easy access to calculated effects and modifiers
 */

import { useMemo } from 'react';
import { useUnlocks } from './useUnlocks';
import {
  calculateActiveEffects,
  calculatePartEffects,
  calculateBonusEffects,
  calculateMissionStats,
  getEffectsSummary,
  type MissionStats,
} from '../utils/unlockEffects';
import type { UnlockEffect } from '../../shared/types/unlock';

export function useUnlockEffects() {
  const { tree, status } = useUnlocks();

  /**
   * Get all active effects from purchased unlocks
   */
  const activeEffects = useMemo<UnlockEffect>(() => {
    return calculateActiveEffects(tree, status);
  }, [tree, status]);

  /**
   * Get effects from bonus unlocks only
   */
  const bonusEffects = useMemo<UnlockEffect>(() => {
    return calculateBonusEffects(tree, status);
  }, [tree, status]);

  /**
   * Get a text summary of active effects
   */
  const effectsSummary = useMemo<string[]>(() => {
    return getEffectsSummary(tree, status);
  }, [tree, status]);

  /**
   * Calculate effects from specific parts
   */
  const getPartEffects = (partIds: string[]): UnlockEffect => {
    return calculatePartEffects(partIds, tree);
  };

  /**
   * Calculate mission stats with effects applied
   */
  const applyEffectsToMission = (
    baseStats: MissionStats,
    selectedParts: string[]
  ): MissionStats => {
    return calculateMissionStats(baseStats, selectedParts, tree, status);
  };

  return {
    activeEffects,
    bonusEffects,
    effectsSummary,
    getPartEffects,
    applyEffectsToMission,
  };
}
