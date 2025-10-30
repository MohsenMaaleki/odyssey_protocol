# Implementation Plan

- [x] 1. Create unlock tree data structure and type definitions

  - Create `src/server/data/unlockTree.ts` with static unlock tree definition
  - Create `src/shared/types/unlock.ts` with TypeScript interfaces for unlock system
  - Define UnlockNode, UnlockTree, UnlockStatus, PurchaseResult, and API types
  - Export UNLOCK_TREE constant with initial nodes (engines, fuel tanks, missions, bonuses)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Implement UnlockService core logic

  - [x] 2.1 Create UnlockService class with constructor and initialization

    - Create `src/server/services/unlock.ts`

    - Implement constructor accepting redis, reddit, and context
    - Implement `initializeUser()` method to set up storage for new users
    - Implement `getCurrentSeason()` helper method
    - _Requirements: 1.1, 1.4, 5.4_

  - [x] 2.2 Implement unlock status retrieval

    - Implement `getUnlockStatus()` method to fetch user's SP and purchased unlocks
    - Use Redis keys: `unlock:{username}:sp`, `unlock:{username}:purchased`, `unlock:{username}:meta`
    - Parse and return UnlockStatus with SP, unlocks array, and metadata
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.3 Implement Science Points management

    - Implement `addSciencePoints()` method using Redis INCRBY
    - Implement `getSciencePoints()` helper method
    - Ensure SP values are stored as strings and parsed as integers
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 2.4 Implement unlock purchase with atomic transactions

    - Implement `purchaseUnlock()` method with Redis WATCH/MULTI/EXEC
    - Validate unlock ID exists in UNLOCK_TREE
    - Check if unlock already purchased
    - Validate prerequisites are met
    - Verify sufficient SP balance
    - Execute atomic transaction: deduct SP, add to purchased set, update metadata
    - Handle transaction failures and rollback
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 2.5 Implement prerequisite validation

    - Implement `getUnlockNode()` helper to find nodes by ID
    - Implement prerequisite checking logic in purchase flow
    - Return missing prerequisites in error response
    - _Requirements: 3.2, 3.3_

  - [x] 2.6 Implement moderator operations

    - Implement `checkModeratorPermission()` using Reddit API
    - Implement `resetSeason()` method for moderator-only season resets
    - Increment global season number
    - Handle season mismatch detection in getUnlockStatus
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 3. Create unlock API routes

  - [x] 3.1 Set up unlock router and middleware

    - Create `src/server/routes/unlock.ts`
    - Import UnlockService and UNLOCK_TREE
    - Create Express router instance
    - _Requirements: 2.5_

  - [x] 3.2 Implement GET /api/unlocks/tree endpoint

    - Get current username from Reddit API
    - Initialize user if needed
    - Fetch unlock status
    - Return tree definition and user status
    - Handle authentication errors
    - _Requirements: 2.5, 5.2, 5.3_

  - [x] 3.3 Implement GET /api/unlocks/status endpoint

    - Get current username from Reddit API
    - Fetch and return user's unlock status
    - Handle authentication errors
    - _Requirements: 5.2, 5.3_

  - [x] 3.4 Implement POST /api/unlocks/purchase endpoint

    - Parse unlock ID from request body
    - Validate request body
    - Call UnlockService.purchaseUnlock()
    - Return appropriate HTTP status codes (200, 400, 402, 409, 500)
    - Handle errors with descriptive messages
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 3.5 Implement POST /api/unlocks/reset endpoint

    - Get current username from Reddit API
    - Call UnlockService.resetSeason()
    - Return 403 if not moderator
    - Return success with new season number
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 3.6 Mount unlock router in main server

    - Import unlock router in `src/server/index.ts`
    - Mount router with `app.use(unlockRouter)`
    - Initialize unlock storage in on-app-install handler
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 4. Create client-side unlock integration


  - [x] 4.1 Create unlock API client utilities

    - Create `src/client/utils/unlockApi.ts`
    - Implement `fetchUnlockTree()` function
    - Implement `fetchUnlockStatus()` function
    - Implement `purchaseUnlock(id)` function
    - Handle API errors and return typed responses
    - _Requirements: 2.5, 5.2_

  - [x] 4.2 Create unlock context and state management

    - Create `src/client/hooks/useUnlocks.ts`
    - Implement React context for unlock state
    - Provide unlock tree, purchased unlocks, and SP balance
    - Implement purchase handler with optimistic updates
    - Implement refresh handler to fetch latest status
    - _Requirements: 1.5, 5.1, 5.2, 8.1_

  - [x] 4.3 Create TechTreeModal component

    - Create `src/client/components/TechTreeModal.tsx`
    - Display unlock tree in grid layout organized by type
    - Show each node's label, cost, status (Locked/Available/Purchased)
    - Display prerequisites for each node
    - Render purchase buttons for available unlocks
    - Show SP balance at top of modal
    - Handle purchase button clicks
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4_

  - [x] 4.4 Create UnlockNode component

    - Create `src/client/components/UnlockNode.tsx`
    - Display node label, cost, and description
    - Show visual indicator for status (locked/available/purchased)
    - Display prerequisite connections
    - Render purchase button for available nodes
    - Apply effects display (success chance, morale, etc.)
    - _Requirements: 8.3, 8.4, 13.1, 13.2_

  - [x] 4.5 Add tech tree button to main UI

    - Add "Open Tech Tree" button to game UI
    - Make button visible in all game phases
    - Connect button to open TechTreeModal
    - _Requirements: 8.1_

- [x] 5. Integrate unlocks with game phases








  - [ ] 5.1 Filter ship parts in design phase

    - Modify design phase component to check unlock status
    - Filter available parts based on purchased unlocks
    - Display locked parts with disabled state


    - Show unlock requirement tooltip on locked parts
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 5.2 Filter missions in mission selection

    - Modify mission selection component to check unlock status


    - Hide or disable locked missions
    - Display unlock requirement on locked missions
    - Update mission list when unlocks change
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 5.3 Apply unlock effects to gameplay
    - Create utility function to calculate active effects
    - Apply success chance modifiers from unlocked parts
    - Apply morale modifiers from unlocked parts
    - Apply fuel and science bonuses from unlocked parts
    - Integrate effects into mission calculations
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 6. Update Devvit configuration

  - Update `devvit.json` to include redis capability
  - Ensure storage:write permission is declared
  - Ensure mod:read permission is declared
  - Verify server configuration is correct
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 7. Add Science Points earning mechanism

  - Identify gameplay events that award SP (mission success, discoveries, etc.)
  - Implement SP award logic in game service
  - Call UnlockService.addSciencePoints() when SP is earned
  - Display SP earned notification to player
  - _Requirements: 1.1, 1.4, 1.5_

- [ ]\* 8. Write tests for unlock system

  - [ ]\* 8.1 Write unit tests for UnlockService

    - Test initializeUser creates correct storage structure
    - Test getUnlockStatus retrieves data correctly
    - Test addSciencePoints increments balance
    - Test purchaseUnlock validates prerequisites
    - Test purchaseUnlock checks sufficient SP
    - Test purchaseUnlock prevents duplicate purchases
    - Test resetSeason requires moderator permission
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 3.5, 11.1, 11.2, 11.3_

  - [ ]\* 8.2 Write integration tests for unlock transactions

    - Test successful purchase flow end-to-end
    - Test concurrent purchase attempts
    - Test transaction rollback on failure
    - Test season reset clears unlocks
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]\* 8.3 Write API endpoint tests
    - Test GET /api/unlocks/tree returns correct data
    - Test POST /api/unlocks/purchase with valid purchase
    - Test POST /api/unlocks/purchase with insufficient SP (402)
    - Test POST /api/unlocks/purchase with missing prerequisites (409)
    - Test POST /api/unlocks/reset requires moderator (403)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
