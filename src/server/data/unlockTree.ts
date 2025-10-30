/**
 * Static unlock tree definition
 * Defines all available unlocks, their costs, prerequisites, and effects
 */

import type { UnlockTree } from '../../shared/types/unlock';

/**
 * Complete unlock tree with all available nodes
 * Organized by type: parts (engines, fuel tanks), missions, and bonuses
 */
export const UNLOCK_TREE: UnlockTree = {
  nodes: [
    // ===== ENGINE PARTS =====
    {
      id: 'engine_light',
      type: 'part',
      cost: 5,
      label: 'Light Engine',
      description: 'Basic propulsion system with modest performance',
      prereq: [],
      effect: { successChance: 3 },
    },
    {
      id: 'engine_medium',
      type: 'part',
      cost: 10,
      label: 'Medium Engine',
      description: 'Balanced engine with improved reliability',
      prereq: ['engine_light'],
      effect: { successChance: 5 },
    },
    {
      id: 'engine_heavy',
      type: 'part',
      cost: 15,
      label: 'Heavy Engine',
      description: 'Powerful engine that affects crew morale',
      prereq: ['engine_medium'],
      effect: { successChance: 8, morale: -2 },
    },
    {
      id: 'engine_advanced',
      type: 'part',
      cost: 25,
      label: 'Advanced Engine',
      description: 'Cutting-edge propulsion technology',
      prereq: ['engine_heavy'],
      effect: { successChance: 12, morale: 1 },
    },

    // ===== FUEL TANK PARTS =====
    {
      id: 'tank_small',
      type: 'part',
      cost: 3,
      label: 'Small Fuel Tank',
      description: 'Compact fuel storage for short missions',
      prereq: [],
      effect: { maxFuel: 10 },
    },
    {
      id: 'tank_medium',
      type: 'part',
      cost: 8,
      label: 'Medium Fuel Tank',
      description: 'Standard fuel capacity for most missions',
      prereq: ['tank_small'],
      effect: { maxFuel: 20 },
    },
    {
      id: 'tank_large',
      type: 'part',
      cost: 15,
      label: 'Large Fuel Tank',
      description: 'Extended range fuel storage',
      prereq: ['tank_medium'],
      effect: { maxFuel: 35 },
    },
    {
      id: 'tank_massive',
      type: 'part',
      cost: 22,
      label: 'Massive Fuel Tank',
      description: 'Maximum fuel capacity for deep space exploration',
      prereq: ['tank_large'],
      effect: { maxFuel: 50 },
    },

    // ===== MISSIONS =====
    {
      id: 'mission_moon',
      type: 'mission',
      cost: 0,
      label: 'Lunar Orbit',
      description: 'Basic mission to orbit the Moon',
      prereq: [],
    },
    {
      id: 'mission_mars',
      type: 'mission',
      cost: 12,
      label: 'Mars Flyby',
      description: 'Challenging mission to fly past Mars',
      prereq: ['mission_moon'],
    },
    {
      id: 'mission_asteroid',
      type: 'mission',
      cost: 18,
      label: 'Asteroid Survey',
      description: 'Survey nearby asteroids for resources',
      prereq: ['mission_moon'],
    },
    {
      id: 'mission_jupiter',
      type: 'mission',
      cost: 30,
      label: 'Jupiter Expedition',
      description: 'Long-range mission to the gas giant',
      prereq: ['mission_mars', 'mission_asteroid'],
    },
    {
      id: 'mission_deep_space',
      type: 'mission',
      cost: 50,
      label: 'Deep Space Probe',
      description: 'Ultimate challenge: explore beyond the solar system',
      prereq: ['mission_jupiter'],
    },

    // ===== BONUS UNLOCKS =====
    {
      id: 'bonus_morale_boost',
      type: 'bonus',
      cost: 10,
      label: 'Crew Training Program',
      description: 'Improves crew morale on all missions',
      prereq: [],
      effect: { morale: 5 },
    },
    {
      id: 'bonus_science_multiplier',
      type: 'bonus',
      cost: 20,
      label: 'Research Lab',
      description: 'Increases science points earned from missions',
      prereq: ['bonus_morale_boost'],
      effect: { scienceBonus: 25 },
    },
    {
      id: 'bonus_fuel_efficiency',
      type: 'bonus',
      cost: 15,
      label: 'Fuel Optimization',
      description: 'Reduces fuel consumption on all missions',
      prereq: [],
      effect: { maxFuel: 10 },
    },
    {
      id: 'bonus_success_boost',
      type: 'bonus',
      cost: 25,
      label: 'Mission Control AI',
      description: 'Advanced AI assistance for mission planning',
      prereq: ['bonus_morale_boost'],
      effect: { successChance: 10 },
    },
  ],

  // Prerequisite relationships (edges in the tech tree graph)
  edges: [
    // Engine progression
    ['engine_light', 'engine_medium'],
    ['engine_medium', 'engine_heavy'],
    ['engine_heavy', 'engine_advanced'],

    // Fuel tank progression
    ['tank_small', 'tank_medium'],
    ['tank_medium', 'tank_large'],
    ['tank_large', 'tank_massive'],

    // Mission progression
    ['mission_moon', 'mission_mars'],
    ['mission_moon', 'mission_asteroid'],
    ['mission_mars', 'mission_jupiter'],
    ['mission_asteroid', 'mission_jupiter'],
    ['mission_jupiter', 'mission_deep_space'],

    // Bonus progression
    ['bonus_morale_boost', 'bonus_science_multiplier'],
    ['bonus_morale_boost', 'bonus_success_boost'],
  ],
};
