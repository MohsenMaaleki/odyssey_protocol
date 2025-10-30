# Requirements Document

## Introduction

The User Leaderboards feature tracks and displays top contributors in the Odyssey Protocol game by awarding points for meaningful actions such as making decisive choices and completing missions. The system supports seasonal resets, personal rankings, and moderation capabilities to ensure fair competition.

## Glossary

- **Leaderboard System**: The complete point tracking, ranking, and display mechanism
- **Season**: A time-bounded competitive period with its own point totals that can be reset
- **Decisive Action**: The specific user action that triggers a phase transition in a mission
- **Mission Participant**: A user who performed at least one valid action during a mission
- **Point Credit**: The server-side operation that adds points to a user's total
- **Banlist**: A collection of usernames excluded from earning points and appearing in rankings
- **Top N View**: A display showing the highest-ranked users by points
- **Personal Rank**: A user's position relative to all other users based on points
- **Idempotency Key**: A unique identifier ensuring a point credit operation executes exactly once
- **Storage Layer**: The Redis-based persistence mechanism for leaderboard data
- **Moderator**: A Reddit user with moderation privileges in the subreddit

## Requirements

### Requirement 1

**User Story:** As a player, I want to earn points for meaningful contributions, so that my efforts are recognized and tracked

#### Acceptance Criteria

1. WHEN a user performs a decisive action that advances a mission phase, THE Leaderboard System SHALL credit the user with points for ACTION_DECISIVE
2. WHEN a mission completes successfully, THE Leaderboard System SHALL credit all Mission Participants with points for MISSION_SUCCESS
3. WHEN a mission fails, THE Leaderboard System SHALL credit all Mission Participants with points for MISSION_FAIL
4. WHEN a mission is aborted, THE Leaderboard System SHALL credit all Mission Participants with points for MISSION_ABORT
5. WHERE vote participation tracking is enabled, WHEN a user performs a valid action in a phase, THE Leaderboard System SHALL credit the user with points for VOTE_PARTICIPATION

### Requirement 2

**User Story:** As a player, I want to view the top contributors, so that I can see who is leading and compare my performance

#### Acceptance Criteria

1. WHEN a user requests the top contributors list, THE Leaderboard System SHALL return the top N users sorted by points in descending order
2. WHEN multiple users have identical point totals, THE Leaderboard System SHALL sort those users by username in ascending alphabetical order
3. WHEN displaying rankings, THE Leaderboard System SHALL exclude all users present in the Banlist
4. THE Leaderboard System SHALL display each user's rank, username, and point total in the top contributors list
5. THE Leaderboard System SHALL include the current season number and season dates with the top contributors list

### Requirement 3

**User Story:** As a player, I want to see my personal rank and points, so that I know where I stand in the competition

#### Acceptance Criteria

1. WHEN a user requests their personal statistics, THE Leaderboard System SHALL return the user's current point total
2. WHEN a user requests their personal statistics, THE Leaderboard System SHALL compute and return the user's current rank
3. WHEN a banned user requests their personal statistics, THE Leaderboard System SHALL return zero points and null rank with a banned status indicator
4. THE Leaderboard System SHALL compute rank by counting all users with higher point totals than the requesting user

### Requirement 4

**User Story:** As a developer, I want point credits to be idempotent, so that users cannot receive duplicate points for the same action

#### Acceptance Criteria

1. WHEN a point credit request is received, THE Leaderboard System SHALL construct a unique key from mission identifier, username, and reason
2. IF a point credit request matches an existing recent credit key for the current season, THEN THE Leaderboard System SHALL reject the credit request without awarding points
3. WHEN a point credit is successfully awarded, THE Leaderboard System SHALL record the credit key with a timestamp in the recent credits log
4. THE Leaderboard System SHALL validate all point credit requests on the server side before awarding points

### Requirement 5

**User Story:** As a moderator, I want to reset the leaderboard for a new season, so that competition remains fresh and engaging

#### Acceptance Criteria

1. WHEN a Moderator initiates a season reset, THE Leaderboard System SHALL verify the user has moderation privileges
2. WHEN a season reset is confirmed, THE Leaderboard System SHALL clear all user point totals
3. WHEN a season reset is confirmed, THE Leaderboard System SHALL clear all recent credit records
4. WHEN a season reset is confirmed, THE Leaderboard System SHALL increment the season number by one
5. WHEN a season reset is confirmed, THE Leaderboard System SHALL record the new season start timestamp

### Requirement 6

**User Story:** As a moderator, I want to ban users from the leaderboard, so that I can prevent abuse and maintain fair competition

#### Acceptance Criteria

1. WHEN a Moderator bans a user, THE Leaderboard System SHALL verify the moderator has moderation privileges
2. WHEN a user is added to the Banlist, THE Leaderboard System SHALL reject all subsequent point credit requests for that user
3. WHEN a user is added to the Banlist, THE Leaderboard System SHALL exclude that user from all top contributors queries
4. WHEN a Moderator unbans a user, THE Leaderboard System SHALL remove the user from the Banlist
5. WHEN a Moderator unbans a user, THE Leaderboard System SHALL allow that user to earn points and appear in rankings again

### Requirement 7

**User Story:** As a developer, I want configurable point values, so that I can adjust rewards without redeploying the application

#### Acceptance Criteria

1. THE Leaderboard System SHALL store point values for each credit reason in the season metadata
2. WHEN a point credit request omits a point value, THE Leaderboard System SHALL use the configured point value for the specified reason
3. WHEN a point credit request includes a point value, THE Leaderboard System SHALL use the provided point value
4. THE Storage Layer SHALL persist point rule configurations across application restarts

### Requirement 8

**User Story:** As a developer, I want bulk credit operations, so that I can efficiently award points to multiple users simultaneously

#### Acceptance Criteria

1. WHEN a bulk credit request is received with multiple usernames, THE Leaderboard System SHALL credit each user individually
2. WHEN processing bulk credits, THE Leaderboard System SHALL apply idempotency validation to each user credit
3. WHEN processing bulk credits, THE Leaderboard System SHALL exclude all users present in the Banlist
4. WHEN a bulk credit operation completes, THE Leaderboard System SHALL return the count of successfully credited users

### Requirement 9

**User Story:** As a player, I want to access the leaderboard from any game phase, so that I can check rankings without interrupting gameplay

#### Acceptance Criteria

1. THE Leaderboard System SHALL provide a button visible in all mission phases
2. WHEN a user clicks the leaderboard button, THE Leaderboard System SHALL display a modal with leaderboard information
3. THE Leaderboard System SHALL provide separate views for top contributors and personal statistics within the modal
4. WHERE the user is a Moderator, THE Leaderboard System SHALL display moderation controls in the leaderboard modal

### Requirement 10

**User Story:** As a developer, I want atomic point updates, so that concurrent credit operations produce correct totals

#### Acceptance Criteria

1. WHEN multiple point credit requests for the same user occur concurrently, THE Storage Layer SHALL serialize the updates
2. WHEN a point credit is applied, THE Storage Layer SHALL atomically increment the user's point total
3. THE Storage Layer SHALL ensure no point credits are lost due to race conditions
4. THE Storage Layer SHALL maintain consistency between point totals and recent credit records
