# Design Document — Mission Gallery with Images

## Overview

The Mission Gallery feature extends the Odyssey Protocol game by adding persistent mission history with visual commemorative patches. After completing a mission, players can generate a unique mission patch image and save it to a gallery accessible from any game phase. The gallery provides both grid and detail views with pagination, moderation controls, and fallback mechanisms for reliable image generation.

This feature integrates with the existing Devvit architecture, leveraging Redis storage for persistence, server-side image generation, and React-based UI components for the gallery interface.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Game UI       │  │  Gallery     │  │  Gallery Detail │ │
│  │  (RESULT btns) │  │  Grid Modal  │  │  View Modal     │ │
│  └────────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│           │                  │                    │          │
└───────────┼──────────────────┼────────────────────┼──────────┘
            │                  │                    │
            │ API Calls        │                    │
            ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server (Express)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Gallery API Routes                                   │  │
│  │  • POST /api/gallery/save-patch                       │  │
│  │  • GET  /api/gallery/list                             │  │
│  │  • GET  /api/gallery/item/:id                         │  │
│  │  • DELETE /api/gallery/item/:id                       │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐  │
│  │  Gallery Service Layer                                │  │
│  │  • Image Generation (AI + SVG Fallback)               │  │
│  │  • Metadata Generation                                │  │
│  │  • Storage Management                                 │  │
│  │  • Moderation Logic                                   │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
└─────────────────┼────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Devvit Platform Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Redis        │  │ Reddit API   │  │ Media Upload    │  │
│  │ Storage      │  │ (User Info)  │  │ (Image URLs)    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Save Mission Patch Flow**:

   - User clicks "Save Mission Patch" in RESULT phase
   - Client sends POST to `/api/gallery/save-patch` with mission data
   - Server generates metadata via AI prompt
   - Server attempts AI image generation, falls back to SVG if unavailable
   - Server uploads image to Devvit media storage
   - Server creates gallery entry in Redis storage
   - Server returns success response with gallery entry ID
   - Client displays confirmation toast

2. **View Gallery Flow**:

   - User clicks "Open Mission Gallery" from any phase
   - Client sends GET to `/api/gallery/list?page=1&perPage=12`
   - Server retrieves gallery entries from Redis storage
   - Server returns paginated list with metadata
   - Client renders grid modal with thumbnails

3. **Delete Entry Flow** (Moderators only):
   - User clicks "Delete" in detail view
   - Client sends DELETE to `/api/gallery/item/:id`
   - Server verifies moderator permissions
   - Server removes entry from Redis storage
   - Server returns success response
   - Client updates UI and closes detail view

## Components and Interfaces

### Data Models

#### Storage Schema Extension

```typescript
// Global Storage (extends existing schema)
interface GlobalStorage {
  // Existing fields...
  total_science_points: number;
  unlocks: string[];
  mission_counter: number;
  leaderboard: Record<string, number>;

  // New fields for gallery
  gallery: GalleryEntry[];
  gallery_counter: number;
}

interface GalleryEntry {
  id: string; // Format: "G-0001", "G-0002", etc.
  mission_id: string; // Reference to mission (e.g., "OP-001")
  title: string; // e.g., "Luna I — First Orbit"
  subtitle: string; // e.g., "Successful orbital insertion"
  image_url: string | null; // Devvit media URL or null if upload failed
  created_at: string; // ISO 8601 datetime
  science_points: number; // Points earned from mission
  outcome: 'success' | 'fail' | 'abort';
  stats: {
    fuel_end: number; // 0-100
    hull_end: number; // 0-100
    crew_morale_end: number; // 0-100
  };
  credits: {
    generated_by: 'AI' | 'SVG'; // Image generation method
    author: string; // Reddit username (e.g., "u/player123")
  };
}
```

#### API Request/Response Types

```typescript
// Save Mission Patch
interface SavePatchRequest {
  mission_id: string;
  phase: string;
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

interface SavePatchResponse {
  status: 'success' | 'error';
  message: string;
  entry?: GalleryEntry;
}

// List Gallery Entries
interface ListGalleryRequest {
  page: number;
  perPage: number;
}

interface ListGalleryResponse {
  status: 'success' | 'error';
  entries: GalleryEntry[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Get Gallery Item
interface GetGalleryItemResponse {
  status: 'success' | 'error';
  entry?: GalleryEntry;
  message?: string;
}

// Delete Gallery Item
interface DeleteGalleryItemResponse {
  status: 'success' | 'error';
  message: string;
}
```

### Server Components

#### 1. Gallery Service (`src/server/services/gallery.ts`)

Core business logic for gallery operations.

**Responsibilities**:

- Generate mission metadata using AI prompts
- Create mission patch images (AI or SVG fallback)
- Upload images to Devvit media storage
- Manage gallery entries in Redis storage
- Handle duplicate detection and updates
- Enforce 500-entry storage limit
- Validate moderator permissions

**Key Methods**:

```typescript
class GalleryService {
  async saveMissionPatch(missionData: SavePatchRequest, username: string): Promise<GalleryEntry>;
  async listGalleryEntries(page: number, perPage: number): Promise<ListGalleryResponse>;
  async getGalleryEntry(id: string): Promise<GalleryEntry | null>;
  async deleteGalleryEntry(id: string, isModerator: boolean): Promise<boolean>;
  private async generateMetadata(
    missionData: SavePatchRequest
  ): Promise<{ title: string; subtitle: string }>;
  private async generatePatchImage(metadata: PatchMetadata): Promise<string | null>;
  private async generateSVGFallback(metadata: PatchMetadata): Promise<string>;
  private async uploadImage(imageData: Buffer | string, format: 'png' | 'svg'): Promise<string>;
  private findExistingEntry(mission_id: string): GalleryEntry | null;
  private enforceStorageLimit(): void;
}
```

#### 2. Image Generator (`src/server/services/imageGenerator.ts`)

Handles image creation with AI and SVG fallback.

**SVG Template Design**:

```svg
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with outcome color -->
  <rect width="1024" height="1024" fill="{outcomeColor}"/>

  <!-- Border -->
  <rect x="20" y="20" width="984" height="984"
        fill="none" stroke="#fff" stroke-width="4"/>

  <!-- Mission ID at top -->
  <text x="512" y="100" text-anchor="middle"
        font-size="48" fill="#fff" font-weight="bold">
    {mission_id}
  </text>

  <!-- Outcome emoji (center) -->
  <text x="512" y="512" text-anchor="middle"
        font-size="200">
    {emoji}
  </text>

  <!-- Title -->
  <text x="512" y="700" text-anchor="middle"
        font-size="42" fill="#fff" font-weight="bold">
    {title}
  </text>

  <!-- Subtitle -->
  <text x="512" y="760" text-anchor="middle"
        font-size="32" fill="#fff">
    {subtitle}
  </text>

  <!-- Science points at bottom -->
  <text x="512" y="900" text-anchor="middle"
        font-size="36" fill="#fff">
    🧪 {science_points} Science Points
  </text>
</svg>
```

**Color Scheme**:

- Success: `#10b981` (green)
- Fail: `#ef4444` (red)
- Abort: `#f59e0b` (yellow/amber)

**Emoji Mapping**:

- Success: 🚀 or 🛰️ (based on payload)
- Fail: ❌ or 💥
- Abort: 🟥 or ⚠️

#### 3. API Routes (`src/server/routes/gallery.ts`)

Express routes for gallery operations.

**Endpoints**:

```typescript
// POST /api/gallery/save-patch
// Creates or updates a gallery entry
router.post('/api/gallery/save-patch', async (req, res) => {
  // Validate request body
  // Get current username from Reddit API
  // Call galleryService.saveMissionPatch()
  // Return success/error response
});

// GET /api/gallery/list?page=1&perPage=12
// Returns paginated gallery entries
router.get('/api/gallery/list', async (req, res) => {
  // Parse query parameters
  // Call galleryService.listGalleryEntries()
  // Return paginated response
});

// GET /api/gallery/item/:id
// Returns single gallery entry details
router.get('/api/gallery/item/:id', async (req, res) => {
  // Extract ID from params
  // Call galleryService.getGalleryEntry()
  // Return entry or 404
});

// DELETE /api/gallery/item/:id
// Deletes a gallery entry (moderators only)
router.delete('/api/gallery/item/:id', async (req, res) => {
  // Extract ID from params
  // Check moderator permissions via Reddit API
  // Call galleryService.deleteGalleryEntry()
  // Return success/error response
});
```

### Client Components

#### 1. Gallery Button Component (`src/client/components/GalleryButton.tsx`)

Displays "Open Mission Gallery" button in game UI.

**Props**:

```typescript
interface GalleryButtonProps {
  onClick: () => void;
  className?: string;
}
```

#### 2. Save Patch Button Component (`src/client/components/SavePatchButton.tsx`)

Displays "Save Mission Patch" button in RESULT phase.

**Props**:

```typescript
interface SavePatchButtonProps {
  missionData: MissionData;
  onSave: (entry: GalleryEntry) => void;
  disabled?: boolean;
}
```

#### 3. Gallery Modal Component (`src/client/components/GalleryModal.tsx`)

Main modal container for gallery views.

**Props**:

```typescript
interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'grid' | 'detail';
  initialEntryId?: string;
}
```

**State**:

```typescript
interface GalleryModalState {
  view: 'grid' | 'detail';
  currentPage: number;
  entries: GalleryEntry[];
  totalPages: number;
  selectedEntry: GalleryEntry | null;
  loading: boolean;
  error: string | null;
}
```

#### 4. Gallery Grid Component (`src/client/components/GalleryGrid.tsx`)

Displays thumbnail grid of mission patches.

**Props**:

```typescript
interface GalleryGridProps {
  entries: GalleryEntry[];
  onSelectEntry: (entry: GalleryEntry) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

**Grid Layout**:

- 4 columns × 3 rows = 12 items per page
- Responsive: 2 columns on mobile, 3 on tablet, 4 on desktop
- Each card shows:
  - Thumbnail image (aspect ratio 1:1)
  - Mission title
  - Outcome emoji (✅/❌/🟥)
  - Science points earned

#### 5. Gallery Detail Component (`src/client/components/GalleryDetail.tsx`)

Displays full mission patch and details.

**Props**:

```typescript
interface GalleryDetailProps {
  entry: GalleryEntry;
  onClose: () => void;
  onDelete?: (id: string) => void;
  isModerator: boolean;
}
```

**Layout**:

- Full-size patch image (max 800px width)
- Mission metadata (ID, title, subtitle)
- Stats display (fuel, hull, crew morale)
- Science points earned
- Timestamp
- Delete button (moderators only)
- Close/Back button

#### 6. Custom Hook (`src/client/hooks/useGallery.ts`)

Manages gallery state and API interactions.

**Interface**:

```typescript
interface UseGalleryReturn {
  entries: GalleryEntry[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  savePatch: (missionData: MissionData) => Promise<GalleryEntry>;
  loadGallery: (page: number) => Promise<void>;
  getEntry: (id: string) => Promise<GalleryEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  nextPage: () => void;
  prevPage: () => void;
}
```

## Error Handling

### Server-Side Error Handling

1. **Image Generation Failures**:

   - Try AI generation first
   - On failure, fall back to SVG generation
   - If SVG fails, retry once
   - If both retries fail, store entry with `image_url: null`
   - Log error details for debugging

2. **Storage Errors**:

   - Wrap all Redis operations in try-catch
   - Return appropriate HTTP status codes (400, 500)
   - Include descriptive error messages
   - Log errors with context (postId, username, operation)

3. **Permission Errors**:

   - Verify moderator status before delete operations
   - Return 403 Forbidden for unauthorized attempts
   - Log unauthorized access attempts

4. **Validation Errors**:
   - Validate all request parameters
   - Return 400 Bad Request with specific error messages
   - Check for required fields (mission_id, phase, etc.)

### Client-Side Error Handling

1. **API Call Failures**:

   - Display user-friendly error toasts
   - Provide retry mechanisms for transient failures
   - Show loading states during operations
   - Handle network timeouts gracefully

2. **Image Loading Failures**:

   - Display placeholder image if patch image fails to load
   - Show "Image unavailable" message
   - Provide fallback UI for null image_url entries

3. **State Management Errors**:
   - Reset to safe state on errors
   - Clear error messages after user acknowledgment
   - Prevent UI from entering broken states

## Testing Strategy

### Unit Tests

1. **Gallery Service Tests** (`src/server/services/gallery.test.ts`):

   - Test metadata generation with various mission outcomes
   - Test SVG generation with different parameters
   - Test duplicate detection logic
   - Test storage limit enforcement (500 entries)
   - Test entry creation and updates
   - Mock Redis and Reddit API calls

2. **Image Generator Tests** (`src/server/services/imageGenerator.test.ts`):

   - Test SVG template rendering
   - Test color selection based on outcome
   - Test emoji selection logic
   - Validate SVG output structure

3. **API Route Tests** (`src/server/routes/gallery.test.ts`):

   - Test all endpoints with valid inputs
   - Test error responses for invalid inputs
   - Test moderator permission checks
   - Test pagination logic

4. **Client Component Tests**:
   - Test GalleryModal open/close behavior
   - Test GalleryGrid rendering with mock data
   - Test GalleryDetail display and interactions
   - Test pagination controls
   - Test delete button visibility (moderator vs. non-moderator)

### Integration Tests

1. **End-to-End Gallery Flow**:

   - Complete a mission → save patch → verify storage
   - Open gallery → verify entries displayed
   - Click entry → verify detail view
   - Navigate pages → verify pagination
   - Delete entry (as moderator) → verify removal

2. **Image Generation Flow**:

   - Test AI generation path (if available)
   - Test SVG fallback path
   - Test image upload to Devvit media
   - Verify image URLs are accessible

3. **Storage Persistence**:
   - Save multiple entries → verify all stored
   - Restart server → verify entries persist
   - Test 500-entry limit → verify oldest removed

### Manual Testing Scenarios

1. **Happy Path**:

   - Complete mission with success outcome
   - Save mission patch
   - Verify patch appears in gallery
   - Open detail view
   - Verify all metadata correct

2. **SVG Fallback**:

   - Disable AI image generation
   - Save mission patch
   - Verify SVG image generated and displayed
   - Check SVG renders correctly in browser

3. **Pagination**:

   - Create 25+ gallery entries
   - Navigate through pages
   - Verify correct entries on each page
   - Test edge cases (first page, last page)

4. **Duplicate Protection**:

   - Save patch for mission OP-001
   - Complete same mission again
   - Save patch again
   - Verify only one entry exists (updated)

5. **Moderation**:

   - Log in as non-moderator → verify no delete button
   - Log in as moderator → verify delete button visible
   - Delete entry → verify removed from gallery
   - Attempt delete as non-moderator via API → verify 403 error

6. **Error Scenarios**:
   - Simulate image upload failure
   - Simulate Redis connection failure
   - Verify graceful error handling and user feedback

## Design Decisions and Rationales

### 1. SVG Fallback Instead of Canvas

**Decision**: Use server-side SVG generation as fallback instead of client-side canvas rendering.

**Rationale**:

- SVGs are resolution-independent and scale perfectly
- Server-side generation ensures consistent output across clients
- Easier to template and customize than canvas
- Can be uploaded as static assets to Devvit media storage
- No client-side rendering dependencies

### 2. 500-Entry Storage Limit

**Decision**: Cap gallery at 500 entries, removing oldest when limit reached.

**Rationale**:

- Prevents unbounded storage growth
- 500 entries provides substantial history (years of gameplay)
- FIFO removal is simple and predictable
- Can be adjusted based on actual usage patterns
- Reduces Redis storage costs

### 3. Duplicate Detection by mission_id

**Decision**: Prevent duplicates by checking mission_id, update existing entry if found.

**Rationale**:

- Each mission has unique ID (OP-001, OP-002, etc.)
- Players may want to update patch if they replay mission
- Prevents gallery clutter from repeated saves
- Preserves original created_at timestamp for history

### 4. Moderator-Only Delete

**Decision**: Only moderators can delete gallery entries.

**Rationale**:

- Prevents accidental deletion by players
- Allows moderation of inappropriate content
- Maintains gallery integrity
- Players can overwrite entries by replaying missions

### 5. Pagination at 12 Items

**Decision**: Display 12 items per page (4×3 grid).

**Rationale**:

- Fits well on most screen sizes
- Divisible by 2, 3, 4 for responsive layouts
- Balances performance and user experience
- Reduces API payload size

### 6. Image URL Storage Instead of Binary

**Decision**: Store Devvit media URLs instead of image binary data in Redis.

**Rationale**:

- Reduces Redis storage requirements
- Leverages Devvit's CDN for image delivery
- Simplifies backup and migration
- Better performance for image loading

### 7. AI Metadata Generation

**Decision**: Use AI to generate title and subtitle instead of templates.

**Rationale**:

- Creates unique, engaging descriptions
- Adapts to mission context and outcome
- Enhances player experience with variety
- Minimal latency impact (async operation)

## Future Enhancements

1. **Custom Patch Upload**: Allow players to upload custom images
2. **Patch Sharing**: Share patches to subreddit or external platforms
3. **Achievement Badges**: Add special badges for milestone missions
4. **Gallery Filters**: Filter by outcome, date range, or science points
5. **Gallery Search**: Search by mission ID or title
6. **Patch Customization**: Let players choose colors, emojis, or layouts
7. **Gallery Export**: Download all patches as ZIP file
8. **Social Features**: Like/comment on patches, leaderboard integration
