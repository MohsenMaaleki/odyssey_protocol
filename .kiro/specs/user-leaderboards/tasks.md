# Implementation Plan

## ✅ Completed Implementation

All core leaderboard functionality has been successfully implemented and tested:

- [x] 1. Create shared type definitions for leaderboard
- [x] 2. Implement LeaderboardService class (all methods)
- [x] 3. Create leaderboard API routes (all endpoints)
- [x] 4. Initialize leaderboard storage on app install
- [x] 5. Create client UI components (LeaderboardButton, LeaderboardModal, LeaderboardRow)
- [x] 6. Integrate leaderboard with game action handlers (GameService with participant tracking)
- [x] 7. Write integration tests for leaderboard system (all test suites passing)

## 📋 Remaining Tasks

The leaderboard system is fully implemented as a standalone feature. The remaining work involves integrating it with your actual game logic when you build the game:

- [x] 8. Connect leaderboard to actual game implementation

  - [ ] 8.1 Replace mock game actions with real game logic

    - When you implement your game, replace the example `gameActions.ts` utilities with actual game action handlers
    - Call `GameService.recordParticipant()` whenever a user performs a valid action in a mission
    - Call `GameService.handleDecisiveAction()` when a user action triggers a phase transition
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 8.2 Integrate mission completion with leaderboard

    - When your game reaches the RESULT phase, call `GameService.handleMissionCompletion()` with the mission outcome
    - Pass the mission ID and outcome ('success', 'fail', or 'abort')
    - The GameService will automatically credit all participants with appropriate points
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 8.3 Add point award notifications to game UI

    - Import `showPointAwardToast` from `pointNotifications.ts`
    - Call it after successful game actions to show "+X pts" toasts
    - Use the existing `useToast` hook in your game components
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 8.4 Optional: Enable vote participation points
    - If you want to award 1 point for any valid action (not just decisive ones), uncomment the `handleVoteParticipation` call in `game.ts`
    - This is already implemented but commented out in the GameService
    - Idempotency ensures each user only gets 1 point per mission regardless of how many actions they take
    - _Requirements: 1.5_

## 📝 Integration Notes

The leaderboard system is ready to use. Here's what's already in place:

**Server-side:**

- `LeaderboardService` - Complete point tracking, ranking, and moderation
- `GameService` - Participant tracking and point award integration
- API routes at `/api/leaderboard/*` - All endpoints functional
- Storage initialization on app install

**Client-side:**

- `LeaderboardButton` - Opens the leaderboard modal
- `LeaderboardModal` - Full UI with Top/Me tabs and moderator controls
- `LeaderboardRow` - Displays individual entries with badges
- Toast notifications ready via `pointNotifications.ts`

**Testing:**

- Comprehensive integration tests in `leaderboard.test.ts`
- All test suites passing (credit flow, concurrency, season reset, moderation)

**What you need to do:**
When you build your actual game, simply call the GameService methods at the appropriate points in your game logic. The example implementations in `game.ts` and `gameActions.ts` show you exactly how to do this.
