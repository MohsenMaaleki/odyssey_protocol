# Unlock System Integration Guide

This guide explains how to integrate the unlock system with game phases (design, mission selection, and gameplay).

## Overview

The unlock system provides:
- **Part filtering**: Filter ship parts based on unlock status
- **Mission filtering**: Filter missions based on unlock status
- **Effect calculation**: Calculate and apply unlock effects to gameplay

## Components

### 1. Part Selection (`PartSelector`)

Use this component to display available and locked ship parts in the design phase.

```tsx
import { PartSelector } from '../components/PartSelector';

function DesignPhase() {
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [selectedTank, setSelectedTank] = useState<string | null>(null);
  const [isTechTreeOpen, setIsTechTreeOpen] = useState(false);

  return (
    <div>
      <PartSelector
        partType="engine"
        selectedPartId={selectedEngine}
        onSelectPart={setSelectedEngine}
        onOpenTechTree={() => setIsTechTreeOpen(true)}
      />
      
      <PartSelector
        partType="tank"
        selectedPartId={selectedTank}
        onSelectPart={setSelectedTank}
        onOpenTechTree={() => setIsTechTreeOpen(true)}
      />
    </div>
  );
}
```

### 2. Mission Selection (`MissionSelector`)

Use this component to display available and locked missions.

```tsx
import { MissionSelector } from '../components/MissionSelector';

function MissionSelectionPhase() {
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [isTechTreeOpen, setIsTechTreeOpen] = useState(false);

  return (
    <MissionSelector
      selectedMissionId={selectedMission}
      onSelectMission={setSelectedMission}
      onOpenTechTree={() => setIsTechTreeOpen(true)}
    />
  );
}
```

### 3. Active Effects Display (`ActiveEffectsDisplay`)

Display the current active effects from all purchased unlocks.

```tsx
import { ActiveEffectsDisplay } from '../components/ActiveEffectsDisplay';

function GameUI() {
  return (
    <div>
      {/* Full display */}
      <ActiveEffectsDisplay />
      
      {/* Compact display */}
      <ActiveEffectsDisplay compact />
    </div>
  );
}
```

## Hooks

### `useUnlockEffects`

Access unlock effects in your components.

```tsx
import { useUnlockEffects } from '../hooks/useUnlockEffects';

function MissionCalculator() {
  const { applyEffectsToMission, activeEffects } = useUnlockEffects();

  const baseStats = {
    successChance: 50,
    morale: 70,
    maxFuel: 100,
    sciencePoints: 100,
  };

  const selectedParts = ['engine_light', 'tank_medium'];

  // Calculate final stats with effects
  const finalStats = applyEffectsToMission(baseStats, selectedParts);

  return (
    <div>
      <p>Success Chance: {finalStats.successChance}%</p>
      <p>Morale: {finalStats.morale}</p>
      <p>Max Fuel: {finalStats.maxFuel}</p>
      <p>Science Points: {finalStats.sciencePoints}</p>
    </div>
  );
}
```

## Utility Functions

### Filtering Functions (`unlockFilters.ts`)

```tsx
import {
  isPartAvailable,
  isMissionAvailable,
  getAvailableEngines,
  getAvailableFuelTanks,
  getAvailableMissions,
} from '../utils/unlockFilters';

// Check if a specific part is available
const canUseEngine = isPartAvailable('engine_heavy', tree, status);

// Get all available engines
const engines = getAvailableEngines(tree, status);

// Get all available missions
const missions = getAvailableMissions(tree, status);
```

### Effect Calculation Functions (`unlockEffects.ts`)

```tsx
import {
  calculateActiveEffects,
  calculatePartEffects,
  calculateMissionStats,
  applyScienceBonus,
} from '../utils/unlockEffects';

// Get all active effects
const effects = calculateActiveEffects(tree, status);

// Get effects from specific parts
const partEffects = calculatePartEffects(['engine_light', 'tank_medium'], tree);

// Apply science bonus
const bonusPoints = applyScienceBonus(100, 25); // 125 points (100 + 25%)
```

## Integration Examples

### Example 1: Design Phase with Unlock Filtering

```tsx
import { useState } from 'react';
import { PartSelector } from '../components/PartSelector';
import { ActiveEffectsDisplay } from '../components/ActiveEffectsDisplay';
import { useUnlockEffects } from '../hooks/useUnlockEffects';

function ShipDesignPhase() {
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [selectedTank, setSelectedTank] = useState<string | null>(null);
  const { getPartEffects } = useUnlockEffects();

  // Calculate effects from selected parts
  const selectedParts = [selectedEngine, selectedTank].filter(Boolean) as string[];
  const partEffects = getPartEffects(selectedParts);

  return (
    <div className="space-y-6">
      <h2>Design Your Ship</h2>
      
      {/* Show active effects */}
      <ActiveEffectsDisplay />
      
      {/* Engine selection */}
      <PartSelector
        partType="engine"
        selectedPartId={selectedEngine}
        onSelectPart={setSelectedEngine}
      />
      
      {/* Fuel tank selection */}
      <PartSelector
        partType="tank"
        selectedPartId={selectedTank}
        onSelectPart={setSelectedTank}
      />
      
      {/* Show effects from selected parts */}
      {selectedParts.length > 0 && (
        <div className="p-4 bg-blue-50 rounded">
          <h3>Selected Parts Effects:</h3>
          {partEffects.successChance && (
            <p>Success Chance: +{partEffects.successChance}%</p>
          )}
          {partEffects.morale && (
            <p>Morale: {partEffects.morale > 0 ? '+' : ''}{partEffects.morale}</p>
          )}
          {partEffects.maxFuel && (
            <p>Max Fuel: +{partEffects.maxFuel}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

### Example 2: Mission Execution with Effects

```tsx
import { useUnlockEffects } from '../hooks/useUnlockEffects';

function MissionExecution() {
  const { applyEffectsToMission } = useUnlockEffects();

  const executeMission = (missionId: string, selectedParts: string[]) => {
    // Base mission stats
    const baseStats = {
      successChance: 50,
      morale: 70,
      maxFuel: 100,
      sciencePoints: 100,
    };

    // Apply unlock effects
    const finalStats = applyEffectsToMission(baseStats, selectedParts);

    // Use finalStats for mission calculations
    console.log('Final mission stats:', finalStats);
    
    // Execute mission with modified stats...
  };

  return (
    <button onClick={() => executeMission('mission_moon', ['engine_light'])}>
      Launch Mission
    </button>
  );
}
```

### Example 3: Science Points with Bonus

```tsx
import { applyScienceBonus } from '../utils/unlockEffects';
import { useUnlockEffects } from '../hooks/useUnlockEffects';

function MissionComplete() {
  const { activeEffects } = useUnlockEffects();

  const awardSciencePoints = (baseSP: number) => {
    // Apply science bonus from unlocks
    const bonus = activeEffects.scienceBonus || 0;
    const finalSP = applyScienceBonus(baseSP, bonus);
    
    console.log(`Base SP: ${baseSP}, Bonus: ${bonus}%, Final: ${finalSP}`);
    
    // Award points to player...
  };

  return (
    <button onClick={() => awardSciencePoints(100)}>
      Complete Mission
    </button>
  );
}
```

## Best Practices

1. **Always check unlock status**: Before allowing players to use parts or missions, verify they are unlocked
2. **Show locked content**: Display locked items with clear indicators and unlock requirements
3. **Apply effects consistently**: Use the provided utility functions to ensure effects are applied correctly
4. **Update on unlock changes**: Components using `useUnlocks` will automatically re-render when unlocks change
5. **Provide feedback**: Show players how unlocks affect their gameplay through UI elements

## Testing

When testing unlock integration:

1. Test with no unlocks (new player)
2. Test with some unlocks
3. Test with all unlocks
4. Verify effects are calculated correctly
5. Verify locked items are properly disabled
6. Test unlock requirement tooltips
