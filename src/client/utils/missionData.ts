import type { SavePatchRequest } from '../../shared/types/gallery';

/**
 * Game state interface (to be replaced with actual game state type)
 * This represents the expected structure of the game state when implemented
 */
export interface GameState {
  mission_id: string;
  phase: 'PLANNING' | 'LAUNCH' | 'MISSION' | 'RESULT';
  fuel: number;
  hull: number;
  crew_morale: number;
  success_chance: number;
  science_points_delta: number;
  log: string[];
  design: {
    engine: string;
    fuel_tanks: number;
    payload: string;
    crew: string[];
  };
}

/**
 * Collects current mission data from game state and formats it for the gallery API
 *
 * @param gameState - The current game state
 * @returns Formatted mission data ready for SavePatchRequest
 */
export function collectMissionData(gameState: GameState): SavePatchRequest {
  return {
    mission_id: gameState.mission_id,
    phase: gameState.phase,
    fuel: gameState.fuel,
    hull: gameState.hull,
    crew_morale: gameState.crew_morale,
    success_chance: gameState.success_chance,
    science_points_delta: gameState.science_points_delta,
    log: [...gameState.log], // Create a copy to avoid mutations
    design: {
      engine: gameState.design.engine,
      fuel_tanks: gameState.design.fuel_tanks,
      payload: gameState.design.payload,
      crew: [...gameState.design.crew], // Create a copy to avoid mutations
    },
  };
}

/**
 * Creates mock mission data for testing purposes
 * This should be removed once the actual game is implemented
 *
 * @param missionNumber - Optional mission number for the ID
 * @returns Mock mission data
 */
export function createMockMissionData(missionNumber: number = 1): SavePatchRequest {
  const missionId = `OP-${String(missionNumber).padStart(3, '0')}`;

  return {
    mission_id: missionId,
    phase: 'RESULT',
    fuel: Math.floor(Math.random() * 100),
    hull: Math.floor(Math.random() * 100),
    crew_morale: Math.floor(Math.random() * 100),
    success_chance: Math.floor(Math.random() * 100),
    science_points_delta: Math.floor(Math.random() * 200) + 50,
    log: [
      'Mission started',
      'Systems check complete',
      'Launch sequence initiated',
      'Orbit achieved',
      'Mission objectives completed',
    ],
    design: {
      engine: 'Ion Drive',
      fuel_tanks: 3,
      payload: 'Science Probe',
      crew: ['Commander Smith', 'Engineer Jones', 'Scientist Brown'],
    },
  };
}

/**
 * Validates that mission data is complete and ready to be saved
 *
 * @param missionData - The mission data to validate
 * @returns True if valid, false otherwise
 */
export function validateMissionData(missionData: SavePatchRequest): boolean {
  // Check required fields
  if (!missionData.mission_id || !missionData.phase) {
    return false;
  }

  // Check numeric fields are valid
  if (
    typeof missionData.fuel !== 'number' ||
    typeof missionData.hull !== 'number' ||
    typeof missionData.crew_morale !== 'number' ||
    typeof missionData.success_chance !== 'number' ||
    typeof missionData.science_points_delta !== 'number'
  ) {
    return false;
  }

  // Check arrays
  if (!Array.isArray(missionData.log) || !Array.isArray(missionData.design.crew)) {
    return false;
  }

  // Check design object
  if (
    !missionData.design.engine ||
    typeof missionData.design.fuel_tanks !== 'number' ||
    !missionData.design.payload
  ) {
    return false;
  }

  return true;
}
