# Design Document

## Overview

The Community-Proposed Missions feature is a comprehensive system that enables community-driven content creation for the Odyssey Protocol game. The architecture follows a client-server pattern with Redis-based persistence, Express API endpoints, React UI components, and Devvit scheduled actions for automated ballot management.

The system consists of three main subsystems:
1. **Suggestion Management** - Handles submission, voting, and listing of mission proposals
2. **Ballot System** - Manages curated voting rounds with time-boxed periods
3. **Game Integration** - Provides winner data to seed the next mission

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Suggest Form │  │ Suggestions  │  │    Ballot    │      │
│  │              │  │    Modal     │  │    Modal     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/JSON
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Server Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Express API Routes                       │   │
│  │  /api/missions/suggest/*                             │   │
│  │  /api/missions/ballot/*                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           MissionSuggestionService                    │   │
│  │  - submitSuggestion()                                │   │
│  │  - voteSuggestion()                                  │   │
│  │  - listSuggestions()                                 │   │
│  │  - approveSuggestion()                               │   │
│  │  - rejectSuggestion()                                │   │
│  │  - createBallot()                                    │   │
│  │  - closeBallot()                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Devvit Scheduled Actions                      │   │
│  │  - Auto-close ballots at scheduled time              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Redis Protocol
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Redis (via Devvit)                                  │   │
│  │  - global:missionSuggestions                         │   │
│  │  - global:suggestions_meta                           │   │
│  │  - global:ballots                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Suggestion Submission Flow:**
```
User → Form → POST /api/missions/suggest → MissionSuggestionService
  → Validate (banlist, cap, format) → Generate ID → Store in Redis
  → Return suggestion → Update UI
```

**Voting Flow:**
```
User → Vote Button → POST /api/missions/suggest/vote → MissionSuggestionService
  → Check status → Update voters map (idempotent) → Recalculate scores
  → Store in Redis → Return new scores → Update UI
```

**Ballot Creation Flow:**
```
Moderator → Create Ballot → POST /api/missions/ballot/create
  → MissionSuggestionService → Validate IDs → Calculate close time
  → Create ballot → Schedule close action → Store in Redis → Return ballot
```

**Ballot Close Flow:**
```
Scheduled Action (or Mod) → POST /api/missions/ballot/close
  → MissionSuggestionService → Calculate scores → Determine winner
  → Update ballot status → Store in Redis → Return winner
```

## Components and Interfaces

### Server Components

#### MissionSuggestionService

**Purpose:** Core business logic for managing suggestions, votes, and ballots.

**Dependencies:**
- Redis (Devvit storage)
- Reddit API (for username and moderator checks)
- Context (for current user)

**Key Methods:**

```typescript
class MissionSuggestionService {
  // Suggestion Management
  async submitSuggestion(
    title: string,
    target: string,
    risk: string,
    reward: string,
    description: string,
    payload_hint: string,
    proposer: string
  ): Promise<{ ok: boolean; suggestion?: Suggestion; message?: string }>;

  async voteSuggestion(
    suggestionId: string,
    username: string,
    value: -1 | 0 | 1
  ): Promise<{ ok: boolean; up: number; down: number; total: number }>;

  async listSuggestions(
    status: 'pending' | 'approved' | 'rejected' | 'all',
    page: number,
    perPage: number,
    sort: 'top' | 'new',
    filterUsername?: string
  ): Promise<PaginatedSuggestions>;

  // Moderation
  async approveSuggestion(
    suggestionId: string,
    moderator: string
  ): Promise<{ ok: boolean; suggestion?: Suggestion }>;

  async rejectSuggestion(
    suggestionId: string,
    moderator: string,
    reason?: string
  ): Promise<{ ok: boolean }>;

  // Ballot Management
  async createBallot(
    suggestionIds: string[],
    closesInMinutes: number,
    moderator: string
  ): Promise<{ ok: boolean; ballot?: Ballot }>;

  async getCurrentBallot(): Promise<{ ballot: Ballot | null; suggestions: Suggestion[] }>;

  async closeBallot(
    ballotId: string
  ): Promise<{ ok: boolean; winner_id?: string }>;

  async getPromotedMission(): Promise<{ suggestion: Suggestion | null; ballot: Ballot | null }>;

  // Utility
  async isUserBanned(username: string): Promise<boolean>;
  async getUserSuggestionCount(username: string): Promise<number>;
  private generateSuggestionId(): string;
  private generateBallotId(): string;
  private validateSuggestionInput(data: SuggestionInput): { valid: boolean; errors: string[] };
}
```

#### API Routes

**Suggestion Routes** (`/src/server/routes/missionSuggestions.ts`):
- `POST /api/missions/suggest` - Submit new suggestion
- `POST /api/missions/suggest/vote` - Vote on suggestion
- `GET /api/missions/suggest/list` - List suggestions with filters
- `POST /api/missions/suggest/mod/approve` - Approve suggestion (mod-only)
- `POST /api/missions/suggest/mod/reject` - Reject suggestion (mod-only)

**Ballot Routes** (`/src/server/routes/missionSuggestions.ts`):
- `POST /api/missions/ballot/create` - Create ballot (mod-only)
- `GET /api/missions/ballot/current` - Get current open ballot
- `POST /api/missions/ballot/close` - Close ballot (mod-only or scheduled)
- `GET /api/missions/ballot/promoted` - Get promoted mission for game integration

### Client Components

#### SuggestMissionButton

**Purpose:** Trigger button to open the suggestion form.

**Props:**
```typescript
interface SuggestMissionButtonProps {
  onClick: () => void;
}
```

#### SuggestionsModal

**Purpose:** Display and manage mission suggestions with tabs and voting.

**Props:**
```typescript
interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  isModerator: boolean;
}
```

**State:**
- `activeTab`: 'top' | 'new' | 'mine' | 'approved'
- `suggestions`: Suggestion[]
- `page`: number
- `totalPages`: number
- `loading`: boolean

**Features:**
- Tab navigation
- Pagination
- Vote up/down buttons
- Moderator approve/reject controls
- Real-time score updates

#### BallotModal

**Purpose:** Display current ballot with voting and countdown.

**Props:**
```typescript
interface BallotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  isModerator: boolean;
}
```

**State:**
- `ballot`: Ballot | null
- `suggestions`: Suggestion[]
- `timeRemaining`: number
- `winner`: Suggestion | null

**Features:**
- Countdown timer
- Vote buttons per suggestion
- Winner highlighting (when closed)
- Moderator close control

#### SuggestionCard

**Purpose:** Reusable component to display a single suggestion.

**Props:**
```typescript
interface SuggestionCardProps {
  suggestion: Suggestion;
  onVote: (id: string, value: -1 | 0 | 1) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showModControls: boolean;
  currentUserVote?: -1 | 0 | 1;
}
```

### Client Utilities

#### missionSuggestionApi.ts

**Purpose:** API client functions for mission suggestions.

```typescript
export async function submitSuggestion(data: SuggestionInput): Promise<ApiResponse<Suggestion>>;
export async function voteSuggestion(id: string, value: -1 | 0 | 1): Promise<ApiResponse<VoteResult>>;
export async function listSuggestions(params: ListParams): Promise<ApiResponse<PaginatedSuggestions>>;
export async function approveSuggestion(id: string): Promise<ApiResponse<Suggestion>>;
export async function rejectSuggestion(id: string, reason?: string): Promise<ApiResponse<void>>;
export async function createBallot(ids: string[], closesInMinutes: number): Promise<ApiResponse<Ballot>>;
export async function getCurrentBallot(): Promise<ApiResponse<BallotWithSuggestions>>;
export async function closeBallot(ballotId: string): Promise<ApiResponse<{ winner_id: string }>>;
export async function getPromotedMission(): Promise<ApiResponse<PromotedMission>>;
```

## Data Models

### Suggestion

```typescript
interface Suggestion {
  id: string;                    // Format: "S-0001"
  title: string;                 // 4-60 chars
  target: string;                // LEO, Moon, Mars, Deep Space, etc.
  risk: 'Low' | 'Medium' | 'High';
  reward: 'Science' | 'Unlock' | 'Prestige';
  description: string;           // ≤ 280 chars
  payload_hint: 'Probe' | 'Hab' | 'Cargo' | 'Any';
  proposer: string;              // Reddit username
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  votes: {
    up: number;
    down: number;
  };
  voters: Record<string, -1 | 0 | 1>;  // username → vote value
  created_at: string;            // ISO datetime
  curated_by: string | null;     // Moderator username
  curated_at: string | null;     // ISO datetime
  ballot_id: string | null;      // Links to ballot if included
}
```

### Ballot

```typescript
interface Ballot {
  id: string;                    // Format: "B-0001"
  suggestion_ids: string[];      // 2-4 suggestion IDs
  created_at: string;            // ISO datetime
  closes_at: string;             // ISO datetime
  status: 'open' | 'closed' | 'promoted';
  winner_id: string | null;      // Set when closed
}
```

### SuggestionsMeta

```typescript
interface SuggestionsMeta {
  counter: number;               // For generating S-XXXX IDs
  banlist: string[];             // Banned usernames
  min_account_age_days: number;  // Optional policy (0 = disabled)
  max_suggestions_per_user: number;  // Per season
  last_ballot_id: number;        // For generating B-XXXX IDs
}
```

### Storage Structure

```typescript
// Redis keys
const STORAGE_KEYS = {
  SUGGESTIONS: 'global:missionSuggestions',
  META: 'global:suggestions_meta',
  BALLOTS: 'global:ballots',
};

// Storage format
interface GlobalStorage {
  missionSuggestions: Suggestion[];
  suggestions_meta: SuggestionsMeta;
  ballots: Ballot[];
}
```

## Error Handling

### Validation Errors

**Client-side:**
- Form validation before submission
- Display inline error messages
- Prevent submission until valid

**Server-side:**
- Validate all inputs
- Return 400 with descriptive error messages
- Log validation failures

### Permission Errors

- Check moderator status for protected endpoints
- Return 403 with "Moderator permission required"
- Log unauthorized access attempts

### Business Logic Errors

- Banlist check → 403 "User is banned"
- Submission cap → 403 "Maximum suggestions reached"
- Invalid suggestion status for voting → 400 "Voting not allowed"
- Duplicate open ballot → 400 "An open ballot already exists"

### Storage Errors

- Wrap all Redis operations in try-catch
- Log errors with context
- Return 500 "Internal server error" to client
- Implement retry logic for transient failures

### Scheduled Action Errors

- Log failures to close ballots
- Implement fallback manual close mechanism
- Alert moderators if auto-close fails

## Testing Strategy

### Unit Tests

**Server-side:**
- `MissionSuggestionService` methods
  - Test suggestion validation
  - Test vote idempotency
  - Test score calculation
  - Test winner determination
  - Test banlist enforcement
  - Test submission cap enforcement

**Client-side:**
- API client functions
- Vote state management
- Countdown timer logic
- Pagination logic

### Integration Tests

- Full suggestion submission flow
- Vote casting and score updates
- Moderator approval/rejection
- Ballot creation and closure
- Scheduled action execution
- Game integration data retrieval

### End-to-End Tests

1. User submits suggestion → appears in list → receives votes → moderator approves
2. Moderator creates ballot → users vote → ballot auto-closes → winner determined
3. Game queries promoted mission → receives winner data
4. Banned user attempts submission → rejected
5. User exceeds submission cap → rejected

### Test Data

- Mock suggestions with various statuses
- Mock ballots in different states
- Mock user data (regular users, moderators, banned users)
- Mock vote patterns (unanimous, split, tied)

## Security Considerations

### Input Validation

- Sanitize all text inputs
- Enforce length limits strictly
- Strip or escape markdown/HTML
- Validate enum values (target, risk, reward, etc.)
- Prevent SQL injection (not applicable with Redis, but good practice)

### Authentication & Authorization

- Verify Reddit authentication on all endpoints
- Check moderator status for protected operations
- Use Devvit's built-in auth middleware
- Never trust client-side permission checks

### Anti-Abuse

- Enforce banlist on all user actions
- Rate-limit submissions (per user per day)
- Idempotent vote storage prevents spam
- Moderator review before ballot inclusion
- Optional: Shadow-ban repeat abusers

### Data Privacy

- Store only Reddit usernames (public data)
- Optional: Hash usernames in voters map
- Don't expose internal IDs or implementation details
- Respect Reddit's privacy policies

## Performance Considerations

### Caching

- Cache suggestion lists for 30 seconds
- Cache current ballot for 10 seconds
- Invalidate cache on writes
- Use Redis TTL for automatic expiration

### Pagination

- Default page size: 20 items
- Maximum page size: 100 items
- Index suggestions by status for fast filtering
- Pre-calculate vote scores on write

### Scheduled Actions

- Use Devvit's scheduler for ballot closure
- Set reasonable check intervals (every minute)
- Batch process multiple ballots if needed
- Log execution time for monitoring

### Database Optimization

- Store suggestions as array (acceptable for moderate scale)
- Consider separate Redis keys per suggestion for large scale
- Use atomic operations for vote updates
- Implement pagination at storage layer

## Deployment Considerations

### Configuration

- Submission cap configurable via environment or admin UI
- Banlist manageable by moderators
- Ballot duration configurable (default: 240 minutes)
- Account age requirement configurable

### Monitoring

- Log all suggestion submissions
- Log all moderator actions
- Track ballot creation and closure
- Monitor scheduled action execution
- Alert on repeated failures

### Rollback Plan

- Feature flag to disable submissions
- Ability to archive all pending suggestions
- Manual ballot closure mechanism
- Data export for backup

## Future Enhancements

### Phase 2 Features

- Real-time vote count updates (Devvit Realtime)
- Comment threads on suggestions
- Suggestion editing (before approval)
- Multiple simultaneous ballots
- Seasonal leaderboards for top proposers
- AI-assisted suggestion quality scoring
- Integration with unlock system (require tech tree progress to submit)

### Scalability

- Move to per-suggestion Redis keys
- Implement search functionality
- Add suggestion categories/tags
- Support image attachments
- Multi-language support
