# Requirements Document

## Introduction

The Unlock Tree System adds a persistent progression layer to Odyssey Protocol where players spend Science Points (SP) to unlock new missions, ship parts, or bonuses. These unlocks dynamically enable options in the DESIGN and mission-selection phases. Progress persists via Devvit's Storage API and is visualized with an interactive post modal.

## Glossary

- **System**: The Unlock Tree System
- **Player**: A Reddit user interacting with the Odyssey Protocol game
- **Science Points (SP)**: Virtual currency earned through gameplay used to purchase unlocks
- **Unlock Node**: An individual item in the tech tree (mission, part, or bonus)
- **Tech Tree**: The complete graph of all available unlocks and their relationships
- **Storage API**: Devvit's persistent data storage mechanism
- **Interactive Post**: Devvit's UI framework for creating interactive Reddit posts
- **Moderator**: A Reddit user with moderator permissions in the subreddit
- **Season**: A time period after which unlocks can be reset
- **Prerequisite**: An unlock that must be purchased before another unlock becomes available

## Requirements

### Requirement 1: Science Points Management

**User Story:** As a player, I want to earn and spend Science Points so that I can unlock new content and progress through the game.

#### Acceptance Criteria

1. THE System SHALL store the total Science Points balance for each player in Devvit Storage API
2. WHEN a player purchases an unlock, THE System SHALL deduct the unlock cost from the player's Science Points balance
3. IF a player has insufficient Science Points for a purchase, THEN THE System SHALL return an error response with status code 402
4. THE System SHALL persist Science Points balance across game sessions using Devvit Storage API
5. THE System SHALL display the current Science Points balance in the user interface

### Requirement 2: Unlock Tree Structure

**User Story:** As a player, I want to see a visual representation of available unlocks so that I can plan my progression strategy.

#### Acceptance Criteria

1. THE System SHALL define a static unlock tree with nodes for missions, ship parts, and bonuses
2. THE System SHALL store unlock node definitions including id, type, cost, label, prerequisites, and effects
3. THE System SHALL organize unlock nodes into three categories: parts, missions, and bonuses
4. THE System SHALL define prerequisite relationships between unlock nodes
5. THE System SHALL provide an API endpoint to retrieve the complete unlock tree structure

### Requirement 3: Unlock Purchase Validation

**User Story:** As a player, I want the system to validate my unlock purchases so that I cannot purchase items I'm not eligible for.

#### Acceptance Criteria

1. WHEN a player attempts to purchase an unlock, THE System SHALL verify the unlock ID exists in the unlock tree
2. WHEN a player attempts to purchase an unlock, THE System SHALL verify all prerequisite unlocks have been purchased
3. IF prerequisites are not met, THEN THE System SHALL return an error response with status code 409
4. WHEN a player attempts to purchase an unlock, THE System SHALL verify the player has sufficient Science Points
5. THE System SHALL prevent duplicate purchases of the same unlock

### Requirement 4: Unlock Purchase Transaction

**User Story:** As a player, I want my unlock purchases to be processed atomically so that my progress is never lost or corrupted.

#### Acceptance Criteria

1. WHEN a purchase is successful, THE System SHALL atomically deduct Science Points and add the unlock to the player's purchased list
2. THE System SHALL record the purchase timestamp for each unlock in unlock metadata
3. THE System SHALL use Devvit Storage API transactions to ensure atomic updates
4. IF a purchase transaction fails, THEN THE System SHALL rollback all changes and return an error
5. THE System SHALL return the updated Science Points balance and unlock list after successful purchase

### Requirement 5: Unlock Status Tracking

**User Story:** As a player, I want to see which unlocks I have purchased so that I can track my progression.

#### Acceptance Criteria

1. THE System SHALL maintain a list of purchased unlock IDs for each player
2. THE System SHALL provide an API endpoint to retrieve the player's unlock status
3. THE System SHALL return purchased unlock IDs, total Science Points, season number, and timestamps
4. THE System SHALL persist unlock status across game sessions using Devvit Storage API
5. THE System SHALL track the season number and tree version in unlock metadata

### Requirement 6: Design Phase Integration

**User Story:** As a player, I want locked ship parts to be unavailable in the design phase so that I must unlock them before use.

#### Acceptance Criteria

1. WHEN a player enters the design phase, THE System SHALL filter available ship parts based on purchased unlocks
2. THE System SHALL disable or hide ship parts that have not been unlocked
3. THE System SHALL display locked ship parts with a visual indicator showing they are unavailable
4. WHEN a player unlocks a ship part, THE System SHALL immediately make it available in the design phase
5. THE System SHALL apply unlock effects (success chance, morale, fuel, science bonus) to unlocked parts

### Requirement 7: Mission Selection Integration

**User Story:** As a player, I want locked missions to be unavailable in mission selection so that I must unlock them before attempting them.

#### Acceptance Criteria

1. WHEN a player views available missions, THE System SHALL filter missions based on purchased unlocks
2. THE System SHALL hide or disable missions that have not been unlocked
3. THE System SHALL display locked missions with a visual indicator showing they are unavailable
4. WHEN a player unlocks a mission, THE System SHALL immediately make it available for selection
5. THE System SHALL prevent players from starting missions that have not been unlocked

### Requirement 8: Tech Tree User Interface

**User Story:** As a player, I want an interactive tech tree interface so that I can view and purchase unlocks easily.

#### Acceptance Criteria

1. THE System SHALL provide a button to open the tech tree modal from any game phase
2. THE System SHALL display unlock nodes in a grid or graph layout within a modal
3. THE System SHALL show each unlock node's label, cost, status, and prerequisites
4. THE System SHALL display unlock node status as Locked, Available, or Purchased
5. THE System SHALL provide a purchase button for each available unlock node

### Requirement 9: Science Points Display

**User Story:** As a player, I want to see my current Science Points balance prominently so that I know what I can afford.

#### Acceptance Criteria

1. THE System SHALL display the current Science Points balance in the tech tree modal
2. THE System SHALL format the Science Points display with an icon and numeric value
3. WHEN Science Points balance changes, THE System SHALL update the display
4. THE System SHALL display Science Points balance in a prominent location at the top of the tech tree modal
5. WHERE Realtime API is enabled, THE System SHALL update Science Points display in real-time

### Requirement 10: Season Reset Functionality

**User Story:** As a moderator, I want to reset all unlocks for a new season so that players can start fresh progression.

#### Acceptance Criteria

1. THE System SHALL provide a moderator-only API endpoint to reset unlocks
2. WHEN a season reset is triggered, THE System SHALL clear all purchased unlocks for all players
3. WHEN a season reset is triggered, THE System SHALL clear all purchase timestamps
4. WHEN a season reset is triggered, THE System SHALL increment the season number
5. THE System SHALL optionally adjust Science Points balance during season reset according to configured policy

### Requirement 11: Moderator Permission Validation

**User Story:** As a moderator, I want season reset functionality to be restricted to moderators so that regular players cannot disrupt progression.

#### Acceptance Criteria

1. WHEN a season reset is requested, THE System SHALL verify the requesting user has moderator permissions
2. THE System SHALL use Reddit API to retrieve the moderator list for the subreddit
3. IF the requesting user is not a moderator, THEN THE System SHALL return an error response with status code 403
4. THE System SHALL log all season reset attempts including the requesting user
5. THE System SHALL return a success message with the new season number after successful reset

### Requirement 12: Concurrent Purchase Handling

**User Story:** As a player, I want the system to handle concurrent purchase attempts gracefully so that I don't lose Science Points or get duplicate unlocks.

#### Acceptance Criteria

1. WHEN multiple purchase requests occur simultaneously for the same player, THE System SHALL process them sequentially
2. THE System SHALL use atomic storage operations to prevent race conditions
3. IF a concurrent purchase would result in negative Science Points, THEN THE System SHALL reject the second purchase
4. THE System SHALL ensure only one purchase succeeds when the same unlock is purchased concurrently
5. THE System SHALL return appropriate error messages for failed concurrent purchases

### Requirement 13: Unlock Effects Application

**User Story:** As a player, I want purchased unlocks to apply their effects to my gameplay so that I benefit from my progression.

#### Acceptance Criteria

1. THE System SHALL store effect definitions for each unlock node (success chance, morale, fuel, science bonus)
2. WHEN a ship part unlock is purchased, THE System SHALL apply its effects when the part is used in design
3. WHEN a bonus unlock is purchased, THE System SHALL apply its effects to relevant game calculations
4. THE System SHALL provide an API to retrieve active effects for a player based on purchased unlocks
5. THE System SHALL calculate cumulative effects when multiple unlocks affect the same attribute

### Requirement 14: API Error Handling

**User Story:** As a player, I want clear error messages when unlock operations fail so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN an unlock purchase fails, THE System SHALL return a descriptive error message
2. THE System SHALL use appropriate HTTP status codes for different error types (400, 402, 403, 409, 500)
3. THE System SHALL include the unlock ID and reason in error responses
4. THE System SHALL log all errors with sufficient detail for debugging
5. THE System SHALL handle storage API errors gracefully and return user-friendly messages

### Requirement 15: Storage Permissions

**User Story:** As a developer, I want the system to have proper Devvit permissions so that it can persist unlock data.

#### Acceptance Criteria

1. THE System SHALL declare storage:write capability in Devvit configuration
2. THE System SHALL declare mod:read capability for moderator permission checks
3. THE System SHALL use Devvit Storage API for all persistent data operations
4. THE System SHALL handle storage permission errors gracefully
5. THE System SHALL validate storage operations succeed before returning success responses
