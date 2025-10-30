# Requirements Document

## Introduction

This feature provides live, low-latency updates to the mission HUD (Fuel, Hull, Crew, Success Chance, Science Points) and countdowns for time-boxed phases in the Odyssey Protocol game. The system uses Devvit's Realtime API for instant updates while gracefully degrading to periodic refreshes for clients without realtime support.

## Glossary

- **HUD**: Heads-Up Display showing mission statistics (Fuel, Hull, Crew, Success Chance, Science Points)
- **Realtime API**: Devvit's publish-subscribe system for low-latency client updates
- **Mission Post**: A Reddit post containing an active Odyssey Protocol mission
- **Phase**: A distinct stage in the mission lifecycle (DESIGN, LAUNCH, FLIGHT, etc.)
- **Countdown Timer**: A visual timer showing time remaining until a phase transition or deadline
- **PostData**: Devvit's per-post persistent storage mechanism
- **Scheduled Action**: Devvit's server-side timer that executes code at a specified time
- **Client**: The browser-based game interface running in a Reddit post
- **Server**: The Devvit backend handling game logic and state management
- **Topic**: A named Realtime API channel for publishing and subscribing to messages
- **Drift Correction**: Synchronizing client-side time calculations with authoritative server time

## Requirements

### Requirement 1

**User Story:** As a player, I want to see mission statistics update instantly when they change, so that I always have accurate information about my mission status

#### Acceptance Criteria

1. WHEN the server updates any mission statistic (Fuel, Hull, Crew, Success Chance, or Science Points), THE Client SHALL receive the update within one message tick
2. WHEN a HUD update message is received, THE Client SHALL animate the visual change over 250 milliseconds
3. WHEN multiple HUD updates occur in rapid succession, THE Client SHALL queue and smoothly transition between each state
4. THE Client SHALL display all five HUD statistics (Fuel, Hull, Crew, Success Chance, Science Points Delta) in a persistent visible area
5. WHEN the Realtime API is unavailable, THE Client SHALL refresh HUD data from PostData every 5 seconds

### Requirement 2

**User Story:** As a player, I want to see live countdowns for mission deadlines, so that I know how much time remains to make decisions

#### Acceptance Criteria

1. WHEN a countdown timer starts, THE Client SHALL display the remaining time in T−mm:ss format
2. WHILE a countdown is active, THE Client SHALL update the displayed time every second using local computation
3. WHEN the countdown reaches 60 seconds remaining, THE Client SHALL change the timer color to warning state
4. WHEN the countdown reaches 10 seconds remaining, THE Client SHALL change the timer color to danger state and apply a blinking animation
5. WHEN the countdown reaches zero, THE Client SHALL display an end state even if no server message has been received

### Requirement 3

**User Story:** As a player, I want countdown timers to remain accurate even if my device clock is incorrect, so that I don't miss deadlines due to time synchronization issues

#### Acceptance Criteria

1. WHEN the server publishes a timer message, THE Server SHALL include the current server timestamp
2. WHEN the Client receives a timer message with server timestamp, THE Client SHALL calculate the time offset between server and local time
3. WHEN computing remaining countdown time, THE Client SHALL apply the calculated offset to correct for clock drift
4. WHEN the Client receives a newer timer message, THE Client SHALL update its drift correction calculation
5. THE Client SHALL ignore timer messages with timestamps older than the most recently processed message

### Requirement 4

**User Story:** As a player, I want the game to work even without realtime support, so that I can play regardless of my browser or connection capabilities

#### Acceptance Criteria

1. WHEN the Realtime API is not supported by the client, THE Client SHALL compute countdown values from PostData timestamps
2. WHEN operating in fallback mode, THE Client SHALL re-render the interface every 5 seconds to update countdowns and HUD
3. WHEN a countdown expires in fallback mode, THE Client SHALL poll the server or wait for the next scheduled refresh to detect the phase transition
4. THE Client SHALL provide identical gameplay functionality in both realtime and fallback modes
5. WHEN transitioning from fallback to realtime mode, THE Client SHALL seamlessly switch to realtime updates without visual disruption

### Requirement 5

**User Story:** As a player, I want the game to recover gracefully from connection interruptions, so that temporary network issues don't disrupt my gameplay

#### Acceptance Criteria

1. WHEN the Realtime connection is lost, THE Client SHALL detect the disconnection within 5 seconds
2. WHEN disconnected, THE Client SHALL switch to fallback mode using local time calculations
3. WHEN the connection is restored, THE Client SHALL resubscribe to all required realtime topics
4. WHEN resubscribing after reconnection, THE Client SHALL request a mission snapshot to synchronize current state
5. WHEN the snapshot is received, THE Client SHALL update all HUD values and countdown timers to match server state

### Requirement 6

**User Story:** As a game administrator, I want all HUD and timer changes to originate from the server, so that players cannot manipulate game state through client modifications

#### Acceptance Criteria

1. THE Server SHALL be the sole authority for publishing HUD update messages
2. THE Server SHALL be the sole authority for publishing timer state messages
3. THE Client SHALL never directly modify Science Points, phase state, or timer values
4. WHEN a phase transition occurs, THE Server SHALL publish an authoritative HUD snapshot with full state
5. THE Server SHALL include a mission identifier and timestamp in every published message to prevent replay attacks

### Requirement 7

**User Story:** As a game administrator, I want countdowns to be enforced by scheduled server actions, so that phase transitions occur reliably even if no players are actively viewing the mission

#### Acceptance Criteria

1. WHEN a countdown timer is started, THE Server SHALL create a Scheduled Action to execute at the deadline
2. WHEN a Scheduled Action executes, THE Server SHALL update the PostData to reflect the phase transition
3. WHEN a Scheduled Action executes, THE Server SHALL publish a timer message with status "ended"
4. WHEN a Scheduled Action executes, THE Server SHALL publish an authoritative HUD snapshot reflecting the new phase
5. THE Server SHALL store countdown deadline timestamps in PostData for client cold-start synchronization

### Requirement 8

**User Story:** As a player, I want to see different types of countdowns for different mission events, so that I understand what each timer represents

#### Acceptance Criteria

1. THE Client SHALL display a launch countdown timer showing time until liftoff during the LAUNCH phase
2. THE Client SHALL display a ballot countdown timer showing time until voting closes during decision phases
3. THE Client SHALL display a phase gate countdown timer showing time until automatic phase transition
4. THE Client SHALL visually distinguish between different countdown types through labels or icons
5. THE Client SHALL display multiple concurrent countdowns when multiple deadlines are active

### Requirement 9

**User Story:** As a developer, I want a snapshot API endpoint to provide current mission state, so that clients can synchronize quickly after cold starts or reconnections

#### Acceptance Criteria

1. THE Server SHALL provide a GET endpoint at /api/mission/snapshot accepting a mission_id parameter
2. WHEN the snapshot endpoint is called, THE Server SHALL return the current mission phase, all HUD statistics, and active timer deadlines
3. WHEN the snapshot endpoint is called, THE Server SHALL include the current server timestamp for drift correction
4. THE Server SHALL respond to snapshot requests within 500 milliseconds
5. THE Server SHALL return HTTP 404 when the requested mission_id does not exist

### Requirement 10

**User Story:** As a player, I want countdown timers to pause and resume correctly when the game state changes, so that I have the appropriate amount of time to make decisions

#### Acceptance Criteria

1. WHEN a countdown is paused, THE Server SHALL publish a timer message with status "paused"
2. WHEN a paused countdown is resumed, THE Server SHALL publish a timer message with status "running" and the remaining time
3. WHEN a countdown is paused, THE Client SHALL stop the local tick animation and display a paused indicator
4. WHEN a paused countdown is resumed, THE Client SHALL restart the local tick animation from the remaining time
5. WHEN a countdown is cancelled, THE Server SHALL publish a timer message with status "ended" and THE Client SHALL remove the countdown display
