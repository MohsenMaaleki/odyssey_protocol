# Requirements Document

## Introduction

The Mission Gallery with Images feature enables players to preserve their space mission achievements by generating unique "mission patch" images and storing mission records in a persistent gallery. After completing a mission, players can create a commemorative patch and browse their mission history through an interactive gallery interface with grid and detail views.

## Glossary

- **Mission Patch**: A square image (1024x1024) representing a completed mission, containing mission metadata and visual elements
- **Gallery System**: The persistent storage and UI components that manage and display mission history
- **Gallery Entry**: A data record containing mission metadata, patch image URL, and mission statistics
- **Outcome Status**: The final result of a mission (success, fail, or abort)
- **Devvit Storage**: Reddit's persistent key-value storage system for app data
- **Interactive Post**: The Devvit web application surface where the game runs
- **Gallery Modal**: The overlay interface displaying mission patches in grid and detail views
- **SVG Fallback**: A server-generated vector graphic used when AI image generation is unavailable

## Requirements

### Requirement 1

**User Story:** As a player, I want to save a mission patch after completing a mission, so that I can commemorate my achievement and view it later

#### Acceptance Criteria

1. WHEN THE player completes a mission and reaches RESULT phase, THE Gallery System SHALL display a "Save Mission Patch" button
2. WHEN THE player clicks "Save Mission Patch", THE Gallery System SHALL generate mission metadata including title and subtitle based on mission outcome
3. WHEN THE mission metadata is generated, THE Gallery System SHALL create a mission patch image using either AI generation or SVG fallback
4. WHEN THE patch image is created, THE Gallery System SHALL upload the image and store the returned URL
5. WHEN THE image upload completes, THE Gallery System SHALL create a gallery entry with mission_id, title, subtitle, image_url, outcome, science_points, stats, and timestamp

### Requirement 2

**User Story:** As a player, I want to view all my past mission patches in a gallery, so that I can review my mission history and achievements

#### Acceptance Criteria

1. WHEN THE player clicks "Open Mission Gallery" from any phase, THE Gallery System SHALL display a modal with a grid view of mission patches
2. THE Gallery System SHALL display twelve mission patches per page in grid view
3. WHILE displaying grid view, THE Gallery System SHALL show thumbnail image, mission title, outcome emoji (✅ for success, ❌ for fail, 🟥 for abort), and science points earned for each entry
4. WHEN THE gallery contains more than twelve entries, THE Gallery System SHALL provide pagination controls with "Next" and "Previous" buttons
5. WHEN THE player clicks a mission patch thumbnail, THE Gallery System SHALL display a detail view with full image, mission_id, title, subtitle, stats, science points, and timestamp

### Requirement 3

**User Story:** As a player, I want the system to prevent duplicate mission patches, so that my gallery remains organized with unique entries

#### Acceptance Criteria

1. WHEN THE player attempts to save a mission patch, THE Gallery System SHALL check if a gallery entry exists for the current mission_id
2. IF a gallery entry exists for the mission_id, THEN THE Gallery System SHALL update the existing entry instead of creating a duplicate
3. WHEN THE gallery entry is updated, THE Gallery System SHALL preserve the original created_at timestamp
4. THE Gallery System SHALL display a notification indicating whether a new patch was created or an existing patch was updated

### Requirement 4

**User Story:** As a moderator, I want to delete inappropriate or test mission patches from the gallery, so that I can maintain gallery quality

#### Acceptance Criteria

1. WHILE viewing gallery detail view, THE Gallery System SHALL display a "Delete" button only when the current user has moderator permissions
2. WHEN THE moderator clicks the "Delete" button, THE Gallery System SHALL remove the gallery entry from storage
3. WHEN THE gallery entry is deleted, THE Gallery System SHALL update the UI to remove the deleted entry from grid view
4. WHEN THE gallery entry is deleted, THE Gallery System SHALL close the detail view and return to grid view
5. THE Gallery System SHALL not display delete controls to non-moderator users

### Requirement 5

**User Story:** As a player, I want mission patches to be generated reliably even when AI services are unavailable, so that I can always save my missions

#### Acceptance Criteria

1. WHEN AI image generation is available, THE Gallery System SHALL request an AI-generated mission patch image
2. IF AI image generation fails or is unavailable, THEN THE Gallery System SHALL generate an SVG fallback image
3. THE Gallery System SHALL render SVG fallback with background color based on outcome (green for success, red for fail, yellow for abort)
4. THE Gallery System SHALL include mission_id, title, and outcome emoji in the SVG fallback image
5. WHEN THE image upload fails, THE Gallery System SHALL retry once before storing the entry with image_url set to null

### Requirement 6

**User Story:** As a system administrator, I want the gallery to maintain a maximum of 500 entries, so that storage usage remains manageable

#### Acceptance Criteria

1. WHEN THE gallery contains more than 500 entries, THE Gallery System SHALL remove the oldest entry before adding a new one
2. THE Gallery System SHALL determine entry age by the created_at timestamp
3. WHEN THE oldest entry is removed, THE Gallery System SHALL delete the associated image from storage if applicable
4. THE Gallery System SHALL maintain the gallery_counter value independently of entry removal

### Requirement 7

**User Story:** As a developer, I want gallery data to persist in Devvit Storage, so that mission history is preserved across sessions

#### Acceptance Criteria

1. THE Gallery System SHALL store gallery entries in storage.global.gallery as an array
2. THE Gallery System SHALL store the gallery_counter in storage.global.gallery_counter as a number
3. WHEN THE Gallery System initializes, THE Gallery System SHALL set gallery to empty array and gallery_counter to 1 if not present
4. THE Gallery System SHALL increment gallery_counter by 1 each time a new gallery entry is created
5. THE Gallery System SHALL persist all gallery data changes to Devvit Storage immediately after modification
