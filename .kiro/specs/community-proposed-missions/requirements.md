# Requirements Document

## Introduction

The Community-Proposed Missions feature enables players to propose, vote on, and curate mission ideas for the Odyssey Protocol game. This system allows community-driven content creation where players submit mission proposals, the community votes on them, moderators curate approved suggestions into ballots, and winning missions are integrated into the game. The feature includes anti-spam measures, time-boxed voting periods, and moderator controls to ensure quality and fairness.

## Glossary

- **Mission Suggestion System**: The complete system for managing community-proposed missions
- **Suggestion**: A mission proposal submitted by a player
- **Ballot**: A curated collection of 2-4 approved suggestions presented for final voting
- **Proposer**: A Reddit user who submits a mission suggestion
- **Voter**: A Reddit user who casts votes on suggestions or ballot items
- **Moderator**: A Reddit user with moderation permissions in the subreddit
- **Vote Value**: A signed integer (-1, 0, or 1) representing down-vote, no-vote, or up-vote
- **Vote Score**: The net total of all votes (up votes minus down votes) for a suggestion
- **Suggestion Status**: The current state of a suggestion (pending, approved, rejected, or archived)
- **Ballot Status**: The current state of a ballot (open, closed, or promoted)
- **Winner**: The suggestion with the highest vote score when a ballot closes
- **Payload Hint**: A mission parameter (Probe, Hab, Cargo, Any) that influences game mechanics
- **Banlist**: A list of usernames prohibited from submitting suggestions or voting
- **Submission Cap**: The maximum number of suggestions a user can submit per season

## Requirements

### Requirement 1: Mission Suggestion Submission

**User Story:** As a player, I want to submit mission proposals so that I can contribute creative ideas to the game.

#### Acceptance Criteria

1. WHEN a player clicks the "Suggest Mission" button, THE Mission Suggestion System SHALL display a form with fields for title, target, risk, reward, payload hint, and description.
2. WHEN a player submits a valid mission suggestion, THE Mission Suggestion System SHALL persist the suggestion with status "pending" and display it in the suggestions list.
3. IF the proposer username exists in the banlist, THEN THE Mission Suggestion System SHALL reject the submission with HTTP status 403 and message "User is banned from submitting suggestions".
4. IF the proposer has reached the submission cap, THEN THE Mission Suggestion System SHALL reject the submission with HTTP status 403 and message "Maximum suggestions per season reached".
5. WHEN validating a submission, THE Mission Suggestion System SHALL require title length between 4 and 60 characters, description length not exceeding 280 characters, and all required fields to be non-empty.

### Requirement 2: Voting on Suggestions

**User Story:** As a player, I want to vote on mission suggestions so that I can influence which missions are selected for the game.

#### Acceptance Criteria

1. WHEN a voter casts a vote on a suggestion, THE Mission Suggestion System SHALL record the vote value (-1, 0, or 1) associated with the voter username.
2. WHEN a voter changes their vote on a suggestion, THE Mission Suggestion System SHALL replace the previous vote value with the new vote value for that voter.
3. WHILE a suggestion has status "pending" or "approved", THE Mission Suggestion System SHALL accept votes from authenticated users.
4. IF a suggestion has status "rejected" or "archived", THEN THE Mission Suggestion System SHALL reject vote attempts with HTTP status 400 and message "Voting not allowed for this suggestion".
5. WHEN calculating vote score, THE Mission Suggestion System SHALL sum all positive vote values for up-votes and sum all negative vote values for down-votes.

### Requirement 3: Suggestion List and Filtering

**User Story:** As a player, I want to browse and filter mission suggestions so that I can discover interesting proposals and track my own submissions.

#### Acceptance Criteria

1. WHEN a user requests the suggestions list, THE Mission Suggestion System SHALL return entries matching the specified status filter (pending, approved, rejected, or all).
2. WHEN a user specifies sort order "top", THE Mission Suggestion System SHALL order suggestions by vote score in descending order.
3. WHEN a user specifies sort order "new", THE Mission Suggestion System SHALL order suggestions by creation timestamp in descending order.
4. WHEN a user requests a specific page, THE Mission Suggestion System SHALL return the subset of suggestions corresponding to that page number and items per page.
5. THE Mission Suggestion System SHALL include pagination metadata with total entries, total pages, current page, and items per page in the response.

### Requirement 4: Moderator Curation

**User Story:** As a moderator, I want to approve or reject mission suggestions so that I can curate high-quality content for the community.

#### Acceptance Criteria

1. WHEN a moderator approves a suggestion, THE Mission Suggestion System SHALL update the suggestion status to "approved" and record the moderator username and timestamp.
2. WHEN a moderator rejects a suggestion, THE Mission Suggestion System SHALL update the suggestion status to "rejected" and optionally record a rejection reason.
3. IF a non-moderator attempts to approve or reject a suggestion, THEN THE Mission Suggestion System SHALL reject the request with HTTP status 403 and message "Moderator permission required".
4. WHILE a suggestion has status "approved", THE Mission Suggestion System SHALL make it eligible for inclusion in ballots.
5. THE Mission Suggestion System SHALL allow moderators to approve or reject suggestions regardless of their current status.

### Requirement 5: Ballot Creation and Management

**User Story:** As a moderator, I want to create ballots with curated suggestions so that the community can vote on the final mission selection.

#### Acceptance Criteria

1. WHEN a moderator creates a ballot, THE Mission Suggestion System SHALL accept between 2 and 4 suggestion IDs and a closing duration in minutes.
2. WHEN creating a ballot, THE Mission Suggestion System SHALL calculate the closing timestamp by adding the duration to the current timestamp.
3. WHEN a ballot is created, THE Mission Suggestion System SHALL set the ballot status to "open" and link each included suggestion to the ballot ID.
4. IF a non-moderator attempts to create a ballot, THEN THE Mission Suggestion System SHALL reject the request with HTTP status 403 and message "Moderator permission required".
5. THE Mission Suggestion System SHALL allow only one ballot with status "open" to exist at any time.

### Requirement 6: Ballot Voting and Display

**User Story:** As a player, I want to vote on ballot options so that I can help select the next mission for the game.

#### Acceptance Criteria

1. WHEN a user requests the current ballot, THE Mission Suggestion System SHALL return the open ballot with all associated suggestion details.
2. WHILE a ballot has status "open", THE Mission Suggestion System SHALL display the ballot with voting controls and a countdown to the closing time.
3. WHEN a user votes on a ballot suggestion, THE Mission Suggestion System SHALL apply the same idempotent voting rules as regular suggestion voting.
4. WHEN a ballot closes, THE Mission Suggestion System SHALL display the winner suggestion with visual highlighting.
5. IF no ballot with status "open" exists, THEN THE Mission Suggestion System SHALL return null for the current ballot request.

### Requirement 7: Automatic Ballot Closure

**User Story:** As a system administrator, I want ballots to close automatically at the scheduled time so that voting periods are enforced consistently.

#### Acceptance Criteria

1. WHEN a ballot closing time is reached, THE Mission Suggestion System SHALL execute a scheduled action to close the ballot.
2. WHEN closing a ballot, THE Mission Suggestion System SHALL calculate the vote score for each suggestion in the ballot.
3. WHEN closing a ballot, THE Mission Suggestion System SHALL identify the suggestion with the highest vote score as the winner.
4. WHEN a winner is determined, THE Mission Suggestion System SHALL update the ballot status to "closed" and record the winner ID.
5. IF multiple suggestions have the same highest score, THEN THE Mission Suggestion System SHALL select the suggestion with the earliest creation timestamp as the winner.

### Requirement 8: Mission Integration

**User Story:** As a game developer, I want ballot winners to be integrated into the game so that community-chosen missions become playable content.

#### Acceptance Criteria

1. WHEN a ballot is closed with a winner, THE Mission Suggestion System SHALL make the winner suggestion available for game integration.
2. WHEN the game requests the promoted mission, THE Mission Suggestion System SHALL provide the winner's payload hint and title.
3. WHEN a winner is integrated into the game, THE Mission Suggestion System SHALL update the ballot status to "promoted".
4. THE Mission Suggestion System SHALL preserve the winner's metadata including title, target, risk, reward, and description for game use.
5. THE Mission Suggestion System SHALL allow the game to query the current promoted mission at any time.

### Requirement 9: Anti-Abuse Measures

**User Story:** As a moderator, I want anti-abuse protections so that the suggestion system remains fair and spam-free.

#### Acceptance Criteria

1. WHEN checking submission eligibility, THE Mission Suggestion System SHALL reject submissions from users in the banlist.
2. WHEN a user submits a suggestion, THE Mission Suggestion System SHALL enforce the maximum suggestions per user limit.
3. WHEN validating suggestion text, THE Mission Suggestion System SHALL trim whitespace and normalize line endings.
4. WHEN processing votes, THE Mission Suggestion System SHALL ensure each user can only have one active vote value per suggestion.
5. THE Mission Suggestion System SHALL store vote records in a map structure keyed by username to prevent duplicate votes.

### Requirement 10: Data Persistence and Retrieval

**User Story:** As a system administrator, I want suggestion and ballot data to persist reliably so that no community contributions are lost.

#### Acceptance Criteria

1. WHEN a suggestion is created, THE Mission Suggestion System SHALL persist it to Redis storage with a unique identifier.
2. WHEN votes are cast, THE Mission Suggestion System SHALL update the voters map and vote counts atomically.
3. WHEN a ballot is created or updated, THE Mission Suggestion System SHALL persist the ballot state to Redis storage.
4. THE Mission Suggestion System SHALL maintain a counter for generating unique suggestion IDs in the format "S-XXXX".
5. THE Mission Suggestion System SHALL maintain a counter for generating unique ballot IDs in the format "B-XXXX".
