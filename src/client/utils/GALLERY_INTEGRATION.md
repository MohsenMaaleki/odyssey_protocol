# Gallery Integration Guide

This document explains how to integrate the Mission Gallery feature with the Odyssey Protocol game once it's implemented.

## Current Status

The gallery system is fully functional but currently uses mock data since the actual game isn't implemented yet. The integration points are clearly marked in the code with comments.

## Integration Steps

### 1. Replace Mock Mission Data

In `src/client/App.tsx`, replace the mock mission data with actual game state:

**Current (Mock):**

```typescript
const mockMissionData: SavePatchRequest = useMemo(() => createMockMissionData(1), []);
```

**Replace with (Actual Game):**

```typescript
const missionData = useMemo(() => collectMissionData(gameState), [gameState]);
```

### 2. Conditional Save Button Display

The "Save Mission Patch" button should only appear in the RESULT phase.

**Current (Always Visible):**

```typescript
<SavePatchButton missionData={mockMissionData} onSave={handleSavePatch} />
```

**Replace with (Conditional):**

```typescript
{gameState.phase === 'RESULT' && (
  <SavePatchButton
    missionData={collectMissionData(gameState)}
    onSave={handleSavePatch}
  />
)}
```

### 3. Update Game State Type

Ensure your game state matches the `GameState` interface in `src/client/utils/missionData.ts`:

```typescript
interface GameState {
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
```

If your game state structure differs, update the `collectMissionData` function accordingly.

### 4. Gallery Button Placement

The "Open Mission Gallery" button is currently visible in all phases. You may want to adjust its visibility based on your game's UX requirements:

```typescript
<GalleryButton onClick={handleOpenGallery} />
```

This can remain visible at all times, or you can conditionally render it based on game state.

## Helper Functions

### `collectMissionData(gameState: GameState): SavePatchRequest`

Transforms game state into the format required by the gallery API. Use this function to prepare mission data before saving.

### `createMockMissionData(missionNumber?: number): SavePatchRequest`

Creates mock mission data for testing. **Remove this once the game is implemented.**

### `validateMissionData(missionData: SavePatchRequest): boolean`

Validates that mission data is complete before saving. Use this to prevent saving incomplete missions.

## Testing

To test the gallery integration:

1. Run `npm run dev` to start the development server
2. Click "Save Mission Patch" to create gallery entries
3. Click "Open Mission Gallery" to view saved missions
4. Test pagination with multiple entries
5. Test the detail view by clicking on mission patches
6. Test moderator delete functionality (currently allows all authenticated users)

## Moderator Permissions

The moderator check is currently a placeholder that allows all authenticated users to delete entries. See task 10 in the implementation plan for proper moderator permission implementation.

## Notes

- The gallery automatically handles duplicate missions by mission_id
- Storage is limited to 500 entries (oldest removed first)
- Images are generated server-side with AI or SVG fallback
- All gallery data persists in Redis storage
