# Implementation Plan

- [x] 1. Create shared types and interfaces

  - Define TypeScript interfaces for Suggestion, Ballot, SuggestionsMeta, and all API request/response types
  - Create shared types in `src/shared/types/missionSuggestions.ts`
  - Export all types from shared index
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 10.1_

- [x] 2. Implement MissionSuggestionService core logic

  - [x] 2.1 Create service class with Redis and Reddit dependencies

    - Initialize MissionSuggestionService class in `src/server/services/missionSuggestions.ts`
    - Add constructor accepting redis, reddit, and context parameters
    - Implement storage key constants and helper methods for data access
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 2.2 Implement suggestion submission logic

    - Write `submitSuggestion()` method with validation
    - Implement banlist check and submission cap enforcement
    - Add ID generation logic (S-XXXX format)
    - Persist suggestion to Redis with status "pending"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 10.1, 10.4_

  - [x] 2.3 Implement voting logic with idempotency

    - Write `voteSuggestion()` method with status validation
    - Update voters map atomically (replace existing vote)
    - Recalculate up/down vote counts from voters map
    - Persist updated suggestion to Redis
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.4, 9.5, 10.2_

  - [x] 2.4 Implement suggestion listing and filtering

    - Write `listSuggestions()` method with status filter
    - Implement sorting by "top" (score) and "new" (timestamp)
    - Add pagination logic with page/perPage parameters
    - Support filtering by username for "Mine" tab
    - Return pagination metadata
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.5 Implement moderator curation methods

    - Write `approveSuggestion()` method updating status to "approved"
    - Write `rejectSuggestion()` method updating status to "rejected"
    - Record moderator username and timestamp for both actions
    - Persist updated suggestions to Redis
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [x] 2.6 Implement ballot creation logic

    - Write `createBallot()` method validating 2-4 suggestion IDs
    - Calculate closing timestamp from duration parameter
    - Generate ballot ID (B-XXXX format)
    - Check for existing open ballot and reject if found
    - Link suggestions to ballot ID
    - Persist ballot to Redis with status "open"
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 10.3, 10.5_

  - [x] 2.7 Implement ballot closure and winner determination

    - Write `closeBallot()` method calculating vote scores
    - Determine winner as highest score (earliest timestamp for ties)
    - Update ballot status to "closed" and record winner_id
    - Persist updated ballot to Redis
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 2.8 Implement ballot and mission query methods

    - Write `getCurrentBallot()` returning open ballot with suggestions
    - Write `getPromotedMission()` returning promoted ballot winner
    - Handle null cases when no ballot exists
    - _Requirements: 6.1, 6.5, 8.1, 8.2, 8.5_

  - [x] 2.9 Implement utility and validation methods

    - Write `isUserBanned()` checking banlist
    - Write `getUserSuggestionCount()` counting user's suggestions
    - Write `validateSuggestionInput()` checking all field requirements
    - Add text normalization (trim, length checks)
    - _Requirements: 1.5, 9.1, 9.2, 9.3_

- [x] 3. Create API routes for suggestions

  - [x] 3.1 Implement POST /api/missions/suggest endpoint

    - Create route handler in `src/server/routes/missionSuggestions.ts`
    - Extract and validate request body fields
    - Get current username from Reddit API
    - Call MissionSuggestionService.submitSuggestion()
    - Return 200 with suggestion or appropriate error status
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Implement POST /api/missions/suggest/vote endpoint

    - Create route handler for voting
    - Extract suggestion ID and vote value from body
    - Get current username from Reddit API
    - Call MissionSuggestionService.voteSuggestion()
    - Return 200 with updated vote counts or error status
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Implement GET /api/missions/suggest/list endpoint

    - Create route handler for listing suggestions
    - Parse query parameters (status, page, perPage, sort)
    - Optionally filter by current username for "Mine" tab
    - Call MissionSuggestionService.listSuggestions()
    - Return 200 with paginated results
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.4 Implement POST /api/missions/suggest/mod/approve endpoint

    - Create route handler with moderator check
    - Extract suggestion ID from body
    - Verify current user is moderator (reuse existing check)
    - Call MissionSuggestionService.approveSuggestion()
    - Return 200 with updated suggestion or 403 if not moderator
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 3.5 Implement POST /api/missions/suggest/mod/reject endpoint

    - Create route handler with moderator check
    - Extract suggestion ID and optional reason from body
    - Verify current user is moderator
    - Call MissionSuggestionService.rejectSuggestion()
    - Return 200 or 403 if not moderator
    - _Requirements: 4.2, 4.3, 4.5_

- [x] 4. Create API routes for ballots

  - [x] 4.1 Implement POST /api/missions/ballot/create endpoint

    - Create route handler with moderator check
    - Extract suggestion IDs and duration from body
    - Verify current user is moderator
    - Call MissionSuggestionService.createBallot()
    - Return 200 with ballot or appropriate error status
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.2 Implement GET /api/missions/ballot/current endpoint

    - Create route handler for fetching current ballot
    - Call MissionSuggestionService.getCurrentBallot()
    - Return 200 with ballot and suggestions or null
    - _Requirements: 6.1, 6.5_

  - [x] 4.3 Implement POST /api/missions/ballot/close endpoint

    - Create route handler with moderator check (or scheduled action auth)
    - Extract ballot ID from body
    - Call MissionSuggestionService.closeBallot()
    - Return 200 with winner_id
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.4 Implement GET /api/missions/ballot/promoted endpoint

    - Create route handler for game integration
    - Call MissionSuggestionService.getPromotedMission()
    - Return 200 with winner suggestion and ballot metadata
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [x] 4.5 Mount mission suggestion routes in main server

    - Import missionSuggestions router in `src/server/index.ts`
    - Mount router with app.use()
    - Ensure routes are registered before server starts
    - _Requirements: All API requirements_

- [x] 5. Implement scheduled ballot closure

  - [x] 5.1 Create scheduled action for auto-closing ballots

    - Define scheduled action in Devvit configuration
    - Set execution interval (every 1 minute)
    - Implement handler checking for ballots past closes_at time
    - Call MissionSuggestionService.closeBallot() for expired ballots
    - Log execution results
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Create client API utilities

  - [x] 6.1 Implement suggestion API client functions

    - Create `src/client/utils/missionSuggestionApi.ts`
    - Write `submitSuggestion()` function calling POST /api/missions/suggest
    - Write `voteSuggestion()` function calling POST /api/missions/suggest/vote
    - Write `listSuggestions()` function calling GET /api/missions/suggest/list
    - Write `approveSuggestion()` function calling POST /api/missions/suggest/mod/approve
    - Write `rejectSuggestion()` function calling POST /api/missions/suggest/mod/reject
    - Add proper error handling and TypeScript types
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2_

  - [x] 6.2 Implement ballot API client functions

    - Write `createBallot()` function calling POST /api/missions/ballot/create
    - Write `getCurrentBallot()` function calling GET /api/missions/ballot/current
    - Write `closeBallot()` function calling POST /api/missions/ballot/close
    - Write `getPromotedMission()` function calling GET /api/missions/ballot/promoted
    - Add proper error handling and TypeScript types
    - _Requirements: 5.1, 6.1, 7.1, 8.1_

- [x] 7. Build SuggestionCard component

  - Create reusable `SuggestionCard.tsx` component in `src/client/components/`
  - Display suggestion title, target, risk, reward, description, proposer, and timestamp
  - Show vote score (up - down) and individual up/down counts
  - Add vote up/down buttons calling onVote callback
  - Highlight current user's vote state
  - Conditionally show moderator approve/reject buttons
  - Style with Tailwind CSS matching existing components
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [x] 8. Build SuggestionsModal component

  - [x] 8.1 Create modal structure and tab navigation

    - Create `SuggestionsModal.tsx` component in `src/client/components/`
    - Implement modal overlay and close button
    - Add tab navigation for Top, New, Mine, Approved
    - Manage active tab state
    - _Requirements: 3.1, 3.2_

  - [x] 8.2 Implement suggestion list display

    - Fetch suggestions using listSuggestions API on tab change
    - Display suggestions using SuggestionCard components
    - Show loading state while fetching
    - Handle empty states for each tab
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 8.3 Add pagination controls

    - Display current page and total pages
    - Add previous/next page buttons
    - Fetch new page data on navigation
    - Disable buttons at boundaries
    - _Requirements: 3.4, 3.5_

  - [x] 8.4 Implement voting functionality

    - Handle vote button clicks from SuggestionCard
    - Call voteSuggestion API
    - Update local state with new vote counts
    - Show toast notification on success/error
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 8.5 Add moderator controls

    - Show approve/reject buttons when isModerator is true
    - Handle approve/reject button clicks
    - Call appropriate API functions
    - Update suggestion status in local state
    - Show toast notification on success/error
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Build BallotModal component

  - [x] 9.1 Create modal structure and ballot display
    - Create `BallotModal.tsx` component in `src/client/components/`
    - Implement modal overlay and close button
    - Fetch current ballot using getCurrentBallot API
    - Display ballot suggestions using SuggestionCard components
    - Handle case when no ballot exists
    - _Requirements: 6.1, 6.5_

  - [x] 9.2 Implement countdown timer
    - Calculate time remaining until closes_at
    - Display countdown in hours:minutes:seconds format
    - Update countdown every second using setInterval
    - Show "Voting closed" when time expires
    - _Requirements: 6.2_

  - [x] 9.3 Add ballot voting functionality
    - Handle vote button clicks on ballot suggestions
    - Call voteSuggestion API (same as suggestions modal)
    - Update local state with new vote counts
    - Show toast notification on success/error
    - _Requirements: 6.3_

  - [x] 9.4 Display winner when ballot is closed
    - Check ballot status and show winner when status is "closed"
    - Highlight winner suggestion with special styling
    - Display winner badge or indicator
    - Show final vote scores
    - _Requirements: 6.4, 7.3, 7.4_

  - [x] 9.5 Add moderator close ballot control
    - Show "Close Ballot" button when isModerator is true and ballot is open
    - Handle close button click calling closeBallot API
    - Update ballot status to "closed" in local state
    - Display winner after closure
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 10. Create SuggestMissionButton component



  - Create `SuggestMissionButton.tsx` component in `src/client/components/`
  - Style button matching existing UI buttons (GalleryButton, LeaderboardButton)
  - Add click handler to open suggestion form
  - Export component from components index
  - _Requirements: 1.1_

- [x] 11. Create BallotButton component



  - Create `BallotButton.tsx` component in `src/client/components/`
  - Style button matching existing UI buttons
  - Add click handler to open ballot modal
  - Export component from components index
  - _Requirements: 6.1_

- [x] 12. Integrate suggestion form using Devvit Forms


  - [x] 12.1 Create form definition in server



    - Define form schema in `src/server/forms/suggestMission.ts`
    - Add fields: title (string, 4-60 chars), target (select), risk (select), reward (select), payload_hint (select), description (paragraph, ≤280 chars)
    - Set field validation rules and help text
    - Register form with Devvit
    - _Requirements: 1.1, 1.5_

  - [x] 12.2 Implement form submission handler


    - Create form onSubmit handler
    - Extract form values and current username
    - Call MissionSuggestionService.submitSuggestion()
    - Show success/error message to user
    - Close form on success
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 12.3 Connect form to SuggestMissionButton

    - Update SuggestMissionButton to trigger Devvit form
    - Pass form ID to button component
    - Ensure form opens in modal/overlay
    - _Requirements: 1.1_

- [x] 13. Integrate components into main App


  - [x] 13.1 Add SuggestMissionButton to App.tsx



    - Import SuggestMissionButton component
    - Add button to UI alongside existing feature buttons
    - Implement click handler to open suggestions modal
    - _Requirements: 1.1_

  - [x] 13.2 Add BallotButton to App.tsx


    - Import BallotButton component
    - Add button to UI alongside existing feature buttons
    - Implement click handler to open ballot modal
    - _Requirements: 6.1_

  - [x] 13.3 Add SuggestionsModal to App.tsx


    - Import SuggestionsModal component
    - Add modal state (isOpen) to App component
    - Pass currentUsername and isModerator props
    - Wire up open/close handlers
    - _Requirements: 3.1, 4.1_

  - [x] 13.4 Add BallotModal to App.tsx

    - Import BallotModal component
    - Add modal state (isOpen) to App component
    - Pass currentUsername and isModerator props
    - Wire up open/close handlers
    - _Requirements: 6.1_

- [x] 14. Implement game integration for promoted missions


  - [x] 14.1 Create hook for fetching promoted mission



    - Create `usePromotedMission.ts` hook in `src/client/hooks/`
    - Fetch promoted mission using getPromotedMission API
    - Return mission data and loading state
    - Cache result to avoid repeated fetches
    - _Requirements: 8.1, 8.2, 8.5_

  - [x] 14.2 Add promoted mission banner to game UI



    - Check if promoted mission exists when starting new mission
    - Display banner with message "Community chose: [title]"
    - Show mission metadata (target, risk, reward)
    - Provide option to use promoted mission or choose different one
    - _Requirements: 8.2, 8.4_

  - [x] 14.3 Integrate promoted mission into game state

    - When user selects promoted mission, populate game state with payload_hint
    - Use promoted mission title as mission name
    - Mark ballot as "promoted" after integration
    - Clear promoted mission from state after use
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 15. Initialize storage on app installation



  - Update app installation handler in `src/server/index.ts`
  - Initialize missionSuggestions array as empty
  - Initialize suggestions_meta with counter: 0, banlist: [], max_suggestions_per_user: 5
  - Initialize ballots array as empty
  - Reuse existing storage initialization pattern from leaderboard
  - _Requirements: 10.1, 10.4, 10.5_

- [x] 16. Add moderator ballot creation UI


  - [x] 16.1 Add "Create Ballot" button to SuggestionsModal



    - Show button only when isModerator is true
    - Display button in Approved tab
    - Add selection checkboxes to approved suggestions
    - Enable button when 2-4 suggestions are selected
    - _Requirements: 5.1, 5.4_

  - [x] 16.2 Implement ballot creation dialog


    - Create dialog/modal for ballot creation
    - Show selected suggestions
    - Add input for closing duration (default: 240 minutes)
    - Add confirm/cancel buttons
    - Call createBallot API on confirm
    - Show toast notification on success/error
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 17. Export components and update index files



  - Export SuggestMissionButton from `src/client/components/index.ts`
  - Export BallotButton from `src/client/components/index.ts`
  - Export SuggestionsModal from `src/client/components/index.ts`
  - Export BallotModal from `src/client/components/index.ts`
  - Export SuggestionCard from `src/client/components/index.ts`
  - Export all API functions from `src/client/utils/missionSuggestionApi.ts`
  - _Requirements: All UI requirements_
