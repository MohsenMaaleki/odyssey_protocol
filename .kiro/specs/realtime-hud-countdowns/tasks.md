# Implementation Plan

- [x] 1. Create shared type definitions for realtime messages

  - Create `src/shared/types/realtime.ts` with BaseRealtimeMessage, HudMessage, TimerMessage, and ToastMessage interfaces
  - Create `src/shared/types/mission.ts` with MissionSnapshotRequest and MissionSnapshotResponse interfaces
  - Export new types from `src/shared/types/api.ts`
  - _Requirements: 1.1, 2.1, 3.1, 6.5_

- [ ] 2. Implement server-side RealtimeService

  - [x] 2.1 Create RealtimeService class structure

    - Create `src/server/services/realtime.ts` with RealtimeService class
    - Implement constructor accepting realtime, redis, and scheduler dependencies
    - Add methods: publishHudUpdate, publishTimerState, startCountdown, pauseCountdown, resumeCountdown, endCountdown
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 2.2 Implement HUD publishing logic

    - Implement publishHudUpdate method to send HudMessage to `rt:mission:{id}:hud` topic
    - Include mission_id, timestamp, and full flag in messages
    - Add error handling and logging for publish failures
    - _Requirements: 1.1, 6.1, 6.5_

  - [x] 2.3 Implement timer state publishing

    - Implement publishTimerState method to send TimerMessage to `rt:mission:{id}:timer` topic
    - Include server timestamp (now) for drift correction
    - Support all timer kinds (LAUNCH, BALLOT, PHASE) and statuses (running, paused, ended)
    - _Requirements: 2.1, 3.1, 6.2, 10.1, 10.2_

  - [ ] 2.4 Implement countdown management with scheduled actions
    - Implement startCountdown method to store deadline in PostData and create scheduled action
    - Implement storeTimerDeadline helper to save timestamps to Redis
    - Implement scheduleTimerEnd helper to register scheduled job metadata
    - Add pauseCountdown and resumeCountdown methods for timer control
    - _Requirements: 7.1, 7.5, 10.1, 10.2_

- [x] 3. Create mission snapshot API endpoint

  - Add GET `/api/mission/snapshot` route in `src/server/routes/mission.ts` (create new file)
  - Implement handler to fetch current mission state from Redis
  - Return MissionSnapshotResponse with all HUD stats, timer deadlines, and server_now timestamp
  - Add error handling for missing mission_id (404 response)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 4. Integrate RealtimeService into existing game logic

  - [x] 4.1 Update server index to configure realtime

    - Add realtime configuration to devvit.json (`realtime: true`)
    - Import and instantiate RealtimeService in `src/server/index.ts`
    - Pass realtime, redis, and scheduler dependencies to service
    - _Requirements: 6.1, 6.2_

  - [x] 4.2 Add HUD publishing to stat change handlers

    - Identify existing game logic that modifies fuel, hull, crew, success, or science points
    - Add calls to realtimeService.publishHudUpdate after each stat change
    - Use `full: true` for phase transitions, `full: false` for incremental updates
    - _Requirements: 1.1, 6.4_

  - [ ] 4.3 Add timer publishing to phase transition handlers
    - Identify phase transition logic (DESIGN→LAUNCH, LAUNCH→FLIGHT, etc.)
    - Add calls to realtimeService.startCountdown when entering timed phases
    - Add calls to realtimeService.endCountdown when phases complete
    - _Requirements: 2.1, 7.1, 7.3, 7.4_

- [x] 5. Implement scheduled action handlers for timer expiration

  - Create scheduled job handler in `src/server/index.ts` for timer expiration
  - Implement logic to update PostData, publish timer ended message, and publish authoritative HUD snapshot
  - Register handler for launch countdown, ballot countdown, and phase gate countdown
  - Add error handling and logging for scheduled action failures
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 6. Create client-side realtime hooks

  - [x] 6.1 Implement useRealtimeHud hook

    - Create `src/client/hooks/useRealtimeHud.ts` with useRealtimeHud hook
    - Subscribe to `rt:mission:{id}:hud` topic using Devvit realtime API
    - Implement message filtering by timestamp to ignore stale messages
    - Update local HUD state on message receipt with smooth transitions
    - Track connection state (connected/disconnected)
    - _Requirements: 1.1, 1.2, 3.5, 5.1, 5.3_

  - [x] 6.2 Implement useRealtimeTimer hook

    - Create `src/client/hooks/useRealtimeTimer.ts` with useRealtimeTimer hook
    - Subscribe to `rt:mission:{id}:timer` topic for specific timer kind
    - Implement drift correction by calculating server offset from message.timer.now
    - Implement local tick interval (100ms) to update remainingMs
    - Handle pause/resume/ended states
    - Implement fallback mode using PostData timestamps when realtime unavailable
    - _Requirements: 2.2, 3.2, 3.3, 3.4, 4.1, 5.2, 5.3, 10.3, 10.4_

  - [x] 6.3 Implement reconnection and snapshot sync

    - Add onDisconnected handler to switch to fallback mode
    - Add onConnected handler to request mission snapshot via `/api/mission/snapshot`
    - Update HUD and timer state from snapshot response
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Create HUD UI components

  - [x] 7.1 Create StatBar component

    - Create `src/client/components/StatBar.tsx` for individual stat display
    - Implement animated bar with CSS transitions (250ms)
    - Display label, icon, current value, and max value
    - Add color coding based on value thresholds
    - _Requirements: 1.2, 1.4_

  - [x] 7.2 Create MissionHud component

    - Create `src/client/components/MissionHud.tsx` as main HUD container
    - Use useRealtimeHud hook to get live HUD state
    - Render StatBar components for fuel, hull, crew, success
    - Render science points delta display
    - Show connection status indicator when disconnected
    - _Requirements: 1.4, 1.5, 4.5_

- [ ] 8. Create countdown timer UI components

  - [x] 8.1 Create CountdownTimer component

    - Create `src/client/components/CountdownTimer.tsx` for individual timer display
    - Use useRealtimeTimer hook to get live timer state
    - Implement formatTime function to display T−mm:ss format
    - Implement getColorClass function for neutral/warning/danger states
    - Add blink animation for danger state (≤10s)
    - Show pause indicator when timer is paused
    - Hide component when timer status is 'ended'
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 10.3_

  - [x] 8.2 Create TimerPanel component

    - Create `src/client/components/TimerPanel.tsx` to display multiple timers
    - Render CountdownTimer for launch, ballot, and phase gate timers
    - Add labels and icons to distinguish timer types
    - Support displaying multiple concurrent timers
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Implement fallback polling mechanism

  - Create `src/client/hooks/useFallbackPolling.ts` hook
  - Implement 5-second interval to re-fetch PostData when realtime unavailable
  - Update HUD and timer state from PostData
  - Automatically disable polling when realtime connection established
  - _Requirements: 1.5, 4.1, 4.2, 4.3_

- [x] 10. Integrate HUD and timers into main game UI

  - Import MissionHud and TimerPanel components into main App component
  - Position HUD in persistent visible area (top or side of screen)
  - Position timers in fixed area within HUD
  - Pass mission_id and initial state from PostData to components
  - Ensure components render on all game screens
  - _Requirements: 1.4, 8.5_

- [x] 11. Add CSS styling for HUD and timers

  - Create `src/client/styles/hud.css` with styles for HUD components
  - Implement smooth animations for stat bar changes (250ms transitions)
  - Add color schemes for neutral/warning/danger timer states
  - Implement blink animation keyframes for danger state
  - Add responsive styles for mobile and desktop
  - Style connection status indicator
  - _Requirements: 1.2, 2.3, 2.4_

- [x] 12. Update PostData schema in existing mission creation

  - Locate existing mission creation logic
  - Add phase_started_at, choices_open_until, launch_countdown_until, phase_gate_until fields to PostData initialization
  - Set initial values to null for new missions
  - _Requirements: 7.5_

- [x] 13. Add error handling and logging

  - Add try-catch blocks around all realtime publish operations
  - Log errors with mission_id and timestamp for debugging
  - Add client-side error boundaries for HUD and timer components
  - Log connection state changes (connected/disconnected)
  - _Requirements: 6.1, 6.2, 7.1_

- [x] 14. Write unit tests for RealtimeService

  - Create `src/server/services/realtime.test.ts`
  - Test publishHudUpdate with various HUD data combinations
  - Test publishTimerState with all timer kinds and statuses
  - Test startCountdown creates PostData entry and scheduled action
  - Mock Redis and realtime API dependencies
  - _Requirements: 6.1, 6.2, 7.1_

- [x] 15. Write unit tests for client hooks

  - Create `src/client/hooks/useRealtimeHud.test.ts`
  - Test HUD state updates on message receipt
  - Test stale message filtering
  - Test connection state tracking
  - Create `src/client/hooks/useRealtimeTimer.test.ts`
  - Test drift correction calculation
  - Test local tick updates
  - Test fallback mode behavior
  - Test pause/resume state handling
  - _Requirements: 1.1, 2.2, 3.2, 3.3, 10.3, 10.4_

- [x] 16. Write integration tests for end-to-end timer flow


  - Create test scenario: start countdown, wait for expiration, verify scheduled action
  - Create test scenario: disconnect, verify fallback, reconnect, verify sync
  - Create test scenario: multiple concurrent timers
  - _Requirements: 2.5, 5.1, 5.2, 5.3, 8.5_
