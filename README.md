# Odyssey Protocol

A Reddit-native space mission game infrastructure built on Devvit. Odyssey Protocol is a competitive space exploration game where players design rockets, unlock technologies, complete missions, and compete for glory on community leaderboards - all within Reddit posts.

**Current Status**: The backend systems and UI components are fully implemented, including a real-time HUD and countdown timer system. The actual space mission gameplay (rocket design, mission phases, voting mechanics) is planned but not yet implemented. The current systems provide the infrastructure that will support the future game.

## What is Odyssey Protocol?

Odyssey Protocol is an **interactive space mission game** that runs entirely within Reddit. Players take on the role of space program directors, making critical decisions about rocket design, mission planning, and resource management. The game combines strategic planning with community competition, allowing players to:

- **Design Custom Rockets**: Choose engines, fuel tanks, payloads, and crew configurations
- **Unlock Advanced Technologies**: Progress through a tech tree inspired by real space programs
- **Complete Challenging Missions**: From lunar orbits to deep space probes, each mission tests your skills
- **Compete on Leaderboards**: Earn points for successful missions and climb seasonal rankings
- **Shape Future Content**: Propose and vote on new mission ideas that become part of the game
- **Track Progress in Real-Time**: Watch live mission statistics and countdown timers as events unfold

The game is built on Devvit, Reddit's developer platform, which means it integrates seamlessly with Reddit's identity system, runs in any subreddit, and requires no external accounts or downloads.

## Core Systems

This project contains six fully functional game systems:

1. **Tech Tree / Unlock System**: A progression system where players spend Science Points (SP) to unlock ship parts, missions, and bonuses through a prerequisite-based tech tree
2. **User Leaderboards**: A competitive ranking system with seasonal resets, point tracking, and moderator controls for managing fair play
3. **Mission Gallery System**: A gallery for creating, browsing, and managing commemorative mission patches with SVG generation
4. **Community-Proposed Missions**: A complete system for players to propose, vote on, and curate mission ideas that can be integrated into the game
5. **Real-time HUD & Countdowns**: Live mission statistics updates and countdown timers using Devvit's Realtime API with graceful fallback to polling
6. **Interactive Counter**: A simple demonstration of Devvit's client-server communication with Redis persistence

## What is This App?

This is a **Reddit-native web application** built with Devvit that provides the infrastructure for a space mission game. The app runs entirely within Reddit posts and integrates with Reddit's identity system.

### Current Features

**Tech Tree System:**

- Unlock 19 different technologies organized into engines, fuel tanks, missions, and bonuses
- Spend Science Points (SP) to purchase unlocks
- Navigate prerequisite chains (e.g., Light Engine → Medium Engine → Heavy Engine → Advanced Engine)
- Each unlock provides gameplay effects (success chance, morale, fuel capacity, science bonuses)
- Visual tech tree interface with status indicators (locked 🔒, available 🔓, purchased ✅)
- Atomic purchase transactions prevent double-spending

**Leaderboard System:**

- Compete with other Reddit users in seasonal rankings
- View top 10 players with rank badges (🥇🥈🥉🎖)
- Track your personal rank and points
- Moderator controls for banning users and resetting seasons
- Idempotent point credits prevent duplicate awards

**Mission Gallery:**

- Save commemorative mission patches with SVG generation
- Browse paginated gallery of all saved missions
- View detailed mission statistics and metadata
- Moderator tools for content curation

**Community-Proposed Missions:**

- Complete backend API with all endpoints functional
- Full UI implementation with all modals and forms
- Submit mission proposals with title, target, risk, reward, and description
- Vote on community suggestions (up/down voting with idempotency)
- Browse suggestions by status (pending, approved, rejected) with sorting (top, new)
- Filter suggestions by "Mine" to see your own submissions
- Moderator curation to approve or reject suggestions
- Ballot system for final voting on 2-4 curated suggestions
- Countdown timer for active ballots
- Automatic ballot closure with winner determination
- Winner highlighting when ballot closes
- Game integration ready for promoted missions
- Anti-abuse measures (banlist, submission caps, validation)

**Real-time HUD & Countdowns:**

- Live mission statistics display (Fuel, Hull, Crew, Success Chance, Science Points)
- Real-time countdown timers with T−mm:ss format
- Drift correction for accurate timers regardless of client clock skew
- Graceful degradation to 5-second polling when realtime unavailable
- Automatic reconnection with state synchronization
- Server-enforced timer deadlines via scheduled actions
- Support for multiple concurrent timers (Launch, Ballot, Phase)
- Color-coded timer states (neutral, warning, danger with blink animation)
- Animated stat bars with smooth 250ms transitions
- Connection status indicator

**Interactive Counter:**

- Simple demonstration of Devvit's client-server communication
- Redis-backed persistence across sessions

All features are tied to your Reddit username and persist across sessions using Redis storage.

## What Makes Odyssey Protocol Innovative

### 1. True Reddit-Native Gaming Experience

Unlike traditional web games that link out to external sites, Odyssey Protocol runs **entirely within Reddit posts**. Built on Devvit, the game leverages Reddit's infrastructure for:

- **Zero-Friction Onboarding**: No accounts, no downloads, no external sites - just click "Launch App" and play
- **Reddit Identity Integration**: Your Reddit username is your game identity, with automatic authentication
- **Subreddit-Specific Competition**: Each subreddit has its own leaderboards, creating localized communities
- **Moderator Tools**: Leverage Reddit's existing permission system for content curation and fair play
- **Mobile-First Design**: Play seamlessly on Reddit's mobile app or desktop browser

This deep integration makes Odyssey Protocol feel like a native Reddit feature rather than a third-party game.

### 2. Deep Tech Tree Progression System

Inspired by games like Civilization and Kerbal Space Program, Odyssey Protocol features a sophisticated unlock system that creates meaningful long-term progression:

- **19 Unlockable Technologies**: Engines (4 tiers), fuel tanks (4 tiers), missions (5 types), and bonuses (4 upgrades)
- **Prerequisite Chains**: Advanced technologies require unlocking earlier tiers first, creating meaningful progression paths
- **Science Points Currency**: A persistent currency that survives season resets, allowing long-term progression
- **Atomic Transactions**: Redis WATCH/MULTI/EXEC pattern ensures no double-spending or race conditions even with concurrent purchases
- **Effect System**: Each unlock provides tangible gameplay benefits:
  - Engines: +3% to +12% success chance, morale modifiers
  - Fuel Tanks: +10 to +50 max fuel capacity
  - Bonuses: +10% success, +5 morale, +25% science points, +10 fuel efficiency
- **Visual Tech Tree UI**: Color-coded status indicators (gray=locked, blue=available, green=purchased) with clear prerequisite display
- **Optimistic Updates**: UI responds instantly while server processes transactions in the background

### 3. Fair Competition Leaderboard System

A robust ranking system designed to prevent cheating and ensure fair play:

- **Idempotent Point Credits**: Each action can only award points once using unique keys (e.g., `mission:OP-001:user:alice:decisive`)
- **Atomic Redis Operations**: WATCH/MULTI/EXEC transactions ensure accurate point totals even with concurrent actions
- **Seasonal Competition**: Leaderboards reset periodically to keep competition fresh and give new players a chance
- **Personal Rank Calculation**: Efficient Redis ZRANK operations show your exact position among all players
- **Moderator Controls**: Ban/unban users, reset seasons, and maintain fair play with proper permission checks
- **Configurable Point Values**: Adjust rewards for different actions without redeploying the app
- **Bulk Credit Operations**: Award points to multiple users simultaneously (e.g., all mission participants)

### 4. NASA-Inspired Mission Patches

The gallery system generates unique commemorative patches similar to real NASA mission patches:

- **Server-Side SVG Generation**: Reliable, scalable vector graphics that work on all devices
- **Color-Coded Outcomes**: Visual indicators for mission results (green=success, red=failure, yellow=abort)
- **Personalized Content**: Each patch includes mission ID, stats, Reddit username, and timestamp
- **Efficient Storage**: Redis-backed with pagination support (500 entry limit with automatic cleanup)
- **Moderator Curation**: Delete inappropriate entries to maintain gallery quality

### 5. Deep Reddit Integration

- **Automatic Authentication**: Reddit identity handled by Devvit middleware, no login required
- **Subreddit-Specific**: Each subreddit has its own leaderboard, gallery, and unlock progress
- **Moderator Tools**: Leverage Reddit's existing permission system for content management
- **Community Competition**: Compete with other members of your subreddit
- **Transparent Rankings**: See exactly where you stand and what it takes to climb higher

### 6. Real-Time Mission Updates with Graceful Degradation

A sophisticated real-time update system that provides instant feedback while maintaining universal compatibility:

- **Devvit Realtime API**: Leverages Reddit's pub/sub infrastructure for instant updates (<100ms latency typical)
- **Drift Correction Algorithm**: Clients calculate time offset from server timestamps to maintain accurate countdowns even with incorrect device clocks
- **Graceful Degradation**: Automatically falls back to 5-second polling when realtime unavailable, maintaining identical functionality
- **Reconnection Resilience**: Detects disconnections, switches to fallback mode, and automatically resubscribes with state sync on reconnection
- **Server Authority**: All state changes originate server-side with scheduled actions enforcing deadlines, preventing client-side manipulation
- **Multiple Timer Support**: Handles concurrent timers (Launch, Ballot, Phase) with independent state management
- **Visual Feedback System**: Color-coded states (neutral/warning/danger), smooth 250ms animations, blink effects for urgency
- **Stale Message Filtering**: Timestamp-based filtering prevents out-of-order messages from causing UI inconsistencies
- **Production-Ready Architecture**: Complete with RealtimeService class, helper functions, client hooks, and comprehensive documentation
- **Demo Component**: Fully functional demo (MissionDemo) allows immediate testing without implementing full gameplay

### 7. Player-Driven Mission Design

Odyssey Protocol puts content creation in the hands of the community with a complete democratic system for proposing and selecting new missions:

- **Democratic Proposal System**: Any player can submit mission ideas through an intuitive form with detailed parameters (target, risk, reward, payload hint, description)
- **Community Voting**: Up/down voting on suggestions with idempotent vote storage (one vote per user per suggestion), real-time score updates
- **Multi-Tab Browsing**: Browse suggestions by Top (highest score), New (most recent), Mine (your submissions), or Approved (curated by mods)
- **Moderator Curation**: Full moderation UI with approve/reject buttons, checkbox selection for ballot creation
- **Time-Boxed Ballots**: Moderators create ballots with 2-4 approved suggestions and configurable voting periods (default 4 hours)
- **Live Countdown Timer**: Real-time countdown display shows exactly when ballot voting closes
- **Automatic Winner Selection**: Scheduled actions close ballots at the specified time and determine winners by vote score
- **Winner Highlighting**: Closed ballots display the winning suggestion with 🏆 badge and special styling
- **Game Integration Ready**: Winning missions can be integrated into gameplay with their payload hints and metadata
- **Anti-Abuse Protection**: Banlist enforcement, per-user submission caps (default: 5), and comprehensive input validation prevent spam
- **Transparent Process**: All suggestions, votes, and ballot results are visible to the community with clear status indicators
- **Pagination Support**: Efficient browsing of large numbers of suggestions with configurable page size

### 8. Production-Ready Architecture

- **Type-Safe Throughout**: TypeScript with strict checking across client, server, and shared types
- **Modular Service Layer**: Separate business logic from API routes for maintainability
- **Comprehensive Error Handling**: Graceful degradation and user-friendly error messages with React Error Boundaries
- **Optimistic UI Updates**: Responsive user experience with background server synchronization
- **Redis Best Practices**: Atomic operations, efficient data structures, and proper key namespacing
- **RESTful API Design**: Clean, predictable endpoints with proper HTTP status codes
- **Scheduled Actions**: Devvit scheduler for automated ballot closure, timer processing, and maintenance tasks
- **Mobile-First**: Responsive design that works on Reddit's mobile app and desktop
- **Realtime Architecture**: Pub/sub messaging with fallback polling for universal compatibility

## How to Play Odyssey Protocol

### Getting Started

Odyssey Protocol is designed to be intuitive and accessible. Here's how to jump in:

1. **Find the Game**: Look for an Odyssey Protocol post in your subreddit (or create one if you're a moderator)
2. **Launch the App**: Click the "Launch App" button on the post to open the game interface
3. **Welcome Aboard**: Your Reddit username automatically appears - you're authenticated and ready to play
4. **Explore the Interface**: The main screen provides access to all game systems through clearly labeled buttons

**Available Features:**

- 🔬 **Tech Tree** - Unlock new rocket parts, missions, and bonuses using Science Points
- 🏆 **Leaderboard** - View seasonal rankings and compete with other players
- 🖼️ **Gallery** - Browse commemorative mission patches from completed missions
- 💡 **Suggest Mission** - Propose new mission ideas for the community to vote on
- 🗳️ **View Ballot** - Vote on curated mission suggestions that will be added to the game
- 🎮 **Mission HUD Demo** - See the real-time mission tracking system in action

**Current Demo Features:**

The game currently includes a working counter (+ and - buttons) that demonstrates the client-server architecture. This simple feature shows how the game saves your progress to Reddit's servers and persists across sessions.

### Interactive Counter (Demo Feature)

A simple demonstration of Devvit's client-server communication:

1. **Click the Buttons**: Use the + and - buttons to change the counter value
2. **Persistent Storage**: The counter value is saved in Redis and persists across sessions
3. **Real-time Updates**: Changes are immediately reflected and stored on the server

This counter demonstrates the basic client-server architecture that powers the more complex features.

### Tech Tree System

Unlock new technologies and capabilities using Science Points:

#### Viewing the Tech Tree

1. **Click "Tech Tree" Button**: Opens the tech tree modal (🔬 icon)
2. **Science Points Display**: Your current SP balance is shown at the top
3. **Organized Categories**: Unlocks are grouped into three sections:
   - **🚀 Ship Parts**: Engines and fuel tanks that improve mission performance
   - **🌍 Missions**: New mission types to attempt (Moon, Mars, Jupiter, etc.)
   - **✨ Bonuses**: Passive upgrades that benefit all missions

#### Understanding Unlock Status

Each unlock card shows:

- **Status Icon**: 🔒 Locked, 🔓 Available, ✅ Purchased
- **Cost**: Science Points required to unlock
- **Description**: What the unlock does
- **Effects**: Specific bonuses (e.g., +5% Success, +10 Max Fuel, +2 Morale)
- **Prerequisites**: Other unlocks that must be purchased first

**Status Colors:**

- **Gray**: Locked (missing prerequisites or insufficient SP)
- **Blue**: Available (prerequisites met and enough SP)
- **Green**: Purchased (already owned)

#### Purchasing Unlocks

1. **Find Available Unlock**: Look for blue cards with 🔓 icon
2. **Check Prerequisites**: Ensure all required unlocks are already purchased (shown with ✓)
3. **Verify SP Balance**: Make sure you have enough Science Points
4. **Click "Purchase" Button**: Instantly unlocks the technology
5. **Optimistic Update**: UI updates immediately while server processes the transaction
6. **Confirmation**: Success or error message appears

#### Unlock Progression Paths

**Engine Progression:**

- Light Engine (5 SP) → Medium Engine (10 SP) → Heavy Engine (15 SP) → Advanced Engine (25 SP)
- Each tier provides better success chances, with advanced engines also boosting morale

**Fuel Tank Progression:**

- Small Tank (3 SP) → Medium Tank (8 SP) → Large Tank (15 SP) → Massive Tank (22 SP)
- Increases maximum fuel capacity for longer missions

**Mission Progression:**

- Lunar Orbit (Free) → Mars Flyby (12 SP) / Asteroid Survey (18 SP) → Jupiter Expedition (30 SP) → Deep Space Probe (50 SP)
- Unlock more challenging and rewarding missions

**Bonus Upgrades:**

- Crew Training (10 SP) → Research Lab (20 SP) / Mission Control AI (25 SP)
- Fuel Optimization (15 SP)
- Provide passive benefits to all missions

#### Earning Science Points (When Game is Implemented)

Science Points will be awarded for:

- **Mission Success**: Complete missions successfully
- **Discoveries**: Find interesting phenomena during missions
- **Achievements**: Reach specific milestones
- **Bonus Multipliers**: Research Lab increases SP earned by 25%

Currently, Science Points must be manually added by developers for testing purposes.

### Leaderboard System

Compete with other players and track your progress:

#### Viewing the Leaderboard

1. **Click "Leaderboard" Button**: Opens the leaderboard modal (🏆 icon)
2. **Top Players Tab**: See the top 10 players ranked by points
   - View rank badges (🥇 gold, 🥈 silver, 🥉 bronze, 🎖 top 10)
   - See each player's username and point total
   - Your row is highlighted in blue if you're in the top 10
   - Season information displayed at the bottom (season number and dates)
3. **My Rank Tab**: View your personal statistics
   - See your current rank and point total
   - View distance to top 10 (e.g., "8 points to break Top 10")
   - Get motivational messages based on your rank
   - See if you're banned from the leaderboard

#### Earning Points (When Game is Implemented)

Points will be awarded for:

- **Decisive Actions**: Making the critical choice that advances a mission phase
- **Mission Success**: Participating in a successful mission
- **Mission Failure**: Participating in a failed mission (fewer points)
- **Mission Abort**: Participating in an aborted mission (minimal points)
- **Vote Participation**: Casting votes during mission phases (optional)

Each action can only award points once per mission (idempotency protection).

#### Moderator Controls

If you're a moderator of the subreddit, additional controls appear at the bottom of the leaderboard modal:

1. **Reset Season**:

   - Click "Reset Season" button
   - Confirm the action in the dialog
   - All points are cleared and a new season begins
   - Season number increments automatically
   - Banlist and point rules are preserved

2. **Ban User**:

   - Click "Ban User" button
   - Enter the username to ban
   - Confirm the action
   - Banned users cannot earn points or appear in rankings
   - Their existing points remain but are hidden

3. **Unban User**:
   - Click "Unban User" button
   - Enter the username to unban
   - Confirm the action
   - User can earn points and appear in rankings again

### Mission Gallery

Save and browse commemorative mission patches:

#### Saving a Mission Patch

1. **Click "Save Mission Patch"**: Generates a new mission patch with mock data
2. **Wait for Confirmation**: A success notification appears in the top-right corner
3. **View Your Creation**: The patch is now saved to the gallery

#### Browsing the Gallery

1. **Click "Open Mission Gallery"**: Opens a modal overlay with the gallery
2. **View Grid Layout**: See up to 12 mission patches per page
3. **Each Card Shows**:
   - Mission patch image (SVG-generated)
   - Mission title
   - Outcome emoji (✅ success, ❌ failure, 🟥 abort)
   - Science points earned
4. **Navigate Pages**: Use "Previous" and "Next" buttons at the bottom

#### Viewing Patch Details

1. **Click Any Patch**: Opens the detail view
2. **See Full Information**:
   - Full-size patch image (up to 800px wide)
   - Mission ID (e.g., "OP-001")
   - Mission title and subtitle
   - Final statistics (fuel, hull integrity, crew morale)
   - Science points earned
   - Timestamp of creation
   - Generation method (SVG)
3. **Go Back**: Click "Back to Gallery" to return to grid view

#### Moderator Gallery Actions

If you're a moderator:

1. **Open Detail View**: Click any patch to view details
2. **Delete Button Appears**: Only visible to moderators
3. **Confirm Deletion**: Click "Delete" and confirm in the dialog
4. **Entry Removed**: The patch is permanently deleted from the gallery

### Community-Proposed Missions System

Contribute your own mission ideas and vote on community proposals. This system is fully implemented with complete backend API and frontend UI.

#### How to Use

1. **Submit Suggestions**: Click "💡 Suggest Mission" button

   - Fill out the form with mission details:
     - Title (4-60 characters)
     - Target (LEO, Moon, Mars, Deep Space, Asteroid Belt, Jupiter, Saturn)
     - Risk level (Low, Medium, High)
     - Reward type (Science, Unlock, Prestige)
     - Payload hint (Probe, Hab, Cargo, Any)
     - Description (up to 280 characters)
   - Click "Submit Suggestion" to propose your mission
   - Your suggestion appears with "pending" status

2. **Browse and Vote on Suggestions**: Click "💡 Suggest Mission" button, then browse tabs

   - **🔥 Top**: View suggestions sorted by vote score (highest first)
   - **⚡ New**: View suggestions sorted by submission time (newest first)
   - **👤 Mine**: View only your own submissions
   - **✓ Approved**: View moderator-approved suggestions
   - Vote up (↑) or down (↓) on any suggestion
   - Your vote is idempotent - you can change it anytime
   - Vote score shows net votes (upvotes - downvotes)
   - Pagination controls at bottom for browsing multiple pages

3. **Moderator Curation** (Moderators Only):

   - Open suggestions modal and view any suggestion
   - Click "✓ Approve" to approve high-quality suggestions
   - Click "✗ Reject" to reject inappropriate suggestions
   - Approved suggestions become eligible for ballots
   - In the Approved tab, select 2-4 suggestions using checkboxes
   - Click "🗳️ Create Ballot" to start a community vote
   - Set voting duration (default: 240 minutes / 4 hours)

4. **Vote on Ballots**: Click "🗳️ View Ballot" button

   - See the current active ballot with 2-4 curated suggestions
   - Countdown timer shows time remaining
   - Vote on your favorite suggestion using ↑/↓ buttons
   - When time expires, ballot automatically closes
   - Winner is highlighted with 🏆 badge
   - Winner determined by highest vote score (ties broken by earliest submission)

5. **Game Integration** (When Gameplay is Implemented):
   - Winning missions will be available for gameplay
   - Payload hint influences mission mechanics
   - Mission metadata used for game state
   - Promoted missions displayed in game UI

#### Features

**Anti-Abuse Protection:**

- Banlist prevents banned users from submitting or voting
- Submission cap limits suggestions per user per season (default: 5)
- Input validation ensures quality submissions (length limits, required fields)
- Idempotent voting prevents vote manipulation
- Moderator oversight maintains content quality

**Automatic Ballot Management:**

- Scheduled action runs every minute to check for expired ballots
- Ballots automatically close at scheduled time
- Winner determined by highest vote score
- Tie-breaker uses earliest submission timestamp
- Only one ballot can be open at a time

**User Experience:**

- Real-time vote count updates
- Toast notifications for all actions
- Responsive design works on mobile and desktop
- Clear status indicators (pending, approved, rejected)
- Pagination for browsing large numbers of suggestions
- Personal submission tracking in "Mine" tab

### Understanding Mock Data and Current Limitations

Currently, the app uses **mock mission data** to demonstrate the gallery system:

- Mission IDs are auto-generated (OP-001, OP-002, etc.)
- Mission stats (fuel, hull, crew morale) are randomized
- Mission logs contain placeholder text
- Rocket designs use example configurations
- The "Save Mission Patch" button is always visible (in the actual game, it will only appear after completing a mission)

**Science Points** must currently be added manually by developers for testing the tech tree. When the game is implemented, SP will be automatically awarded for:

- Completing missions successfully
- Making discoveries during missions
- Reaching specific achievements
- Bonus multipliers from Research Lab unlock (+25%)

**Leaderboard Points** are not automatically awarded yet. The leaderboard system is fully functional and ready to integrate with gameplay. When the game is implemented, points will be automatically awarded for:

- Making decisive actions that advance mission phases
- Participating in successful missions
- Participating in failed or aborted missions (reduced points)
- Optional: Casting votes during mission phases

The tech tree, leaderboard, gallery, community-proposed missions, and real-time HUD systems are production-ready and waiting for the actual space mission gameplay to be implemented.

### Real-time HUD & Countdown Demo

A demonstration of the real-time mission update system is available in the app:

#### Viewing the Demo

1. **Click "🎮 Show Mission HUD Demo"**: Opens a collapsible demo panel at the top of the screen
2. **Mission Statistics Display**: See live HUD showing:
   - ⛽ Fuel: 85/100 (animated progress bar)
   - 🛡️ Hull: 92/100 (animated progress bar)
   - 👥 Crew: 88/100 (animated progress bar)
   - 🎯 Success: 67% (animated progress bar)
   - 🔬 Science: +15 points (delta display)
   - 📍 Phase: FLIGHT (current mission phase)
3. **Live Countdown Timer**: Watch a 2-minute countdown in T−mm:ss format
   - Timer starts at T−02:00 and counts down to T−00:00
   - Color changes: Blue (>60s) → Yellow (≤60s) → Red with blink (≤10s)
   - Demonstrates drift correction with server timestamps
4. **Connection Status**: See realtime connection indicator
   - Green "Connected" when using Devvit Realtime API
   - Yellow "Polling" when using fallback mode (5-second intervals)
5. **Toggle Demo**: Click "Hide Mission HUD Demo" to collapse the panel

#### What the Demo Shows

- **Smooth Animations**: Stat bars transition smoothly over 250ms when values change
- **Timer Accuracy**: Countdown uses server timestamps to correct for clock drift
- **Visual States**: Timer color coding provides at-a-glance status information
- **Graceful Degradation**: Works with or without realtime support
- **Production-Ready**: This is the actual system that will power live missions

The demo uses a mock mission with a 2-minute launch countdown. In the actual game, this HUD will display real mission data and multiple concurrent timers (launch, ballot, phase gates) as missions progress through different phases.

## Technology Stack

- **Devvit**: Reddit's developer platform for building apps
- **React**: Frontend UI framework with hooks
- **TypeScript**: Type-safe development across client and server
- **Express**: Server-side API framework
- **Redis**: Persistent data storage (via Devvit)
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first styling framework

## API Endpoints

The app exposes the following REST API endpoints:

### Counter API

- `GET /api/init` - Initialize counter and get current user info
- `POST /api/increment` - Increment counter value
- `POST /api/decrement` - Decrement counter value

### Gallery API

- `POST /api/gallery/save-patch` - Save a new mission patch
- `GET /api/gallery/list?page=1&perPage=12` - List gallery entries with pagination
- `GET /api/gallery/item/:id` - Get a specific gallery entry by ID
- `DELETE /api/gallery/item/:id` - Delete an entry (moderators only)
- `GET /api/gallery/is-moderator` - Check if current user is a moderator

### Leaderboard API

- `POST /api/leaderboard/credit` - Award points to a user for a specific action
- `POST /api/leaderboard/bulk-credit` - Award points to multiple users simultaneously
- `GET /api/leaderboard/top?n=10` - Get top N players with season info
- `GET /api/leaderboard/me` - Get current user's rank and points
- `POST /api/leaderboard/reset` - Reset season (moderators only)
- `POST /api/leaderboard/ban` - Ban or unban a user (moderators only)

### Unlock API

- `GET /api/unlocks/tree` - Get complete unlock tree and user's status
- `GET /api/unlocks/status` - Get user's unlock status only (SP and purchased unlocks)
- `POST /api/unlocks/purchase` - Purchase an unlock by ID
- `POST /api/unlocks/reset` - Reset season and clear all unlocks (moderators only)

### Mission Suggestion API

- `POST /api/missions/suggest` - Submit a new mission suggestion
- `POST /api/missions/suggest/vote` - Vote on a suggestion (idempotent)
- `GET /api/missions/suggest/list` - List suggestions with filtering, sorting, and pagination
- `POST /api/missions/suggest/mod/approve` - Approve a suggestion (moderators only)
- `POST /api/missions/suggest/mod/reject` - Reject a suggestion (moderators only)

### Ballot API

- `POST /api/missions/ballot/create` - Create a ballot with 2-4 suggestions (moderators only)
- `GET /api/missions/ballot/current` - Get the current open ballot with suggestions
- `POST /api/missions/ballot/close` - Close a ballot and determine winner (moderators only or scheduled)
- `GET /api/missions/ballot/promoted` - Get the promoted mission for game integration

### Mission Realtime API

- `GET /api/mission/snapshot?mission_id=X` - Get current mission state snapshot (HUD stats, timer deadlines, server timestamp)
- Realtime topics (pub/sub):
  - `rt:mission:{id}:hud` - Live HUD updates (fuel, hull, crew, success, science points)
  - `rt:mission:{id}:timer` - Live timer state updates (countdown, pause, resume, end)

## Development Commands

- `npm run dev` - Start development server with live Reddit integration
- `npm run build` - Build production bundles
- `npm run deploy` - Deploy new version to Reddit
- `npm run launch` - Publish app for review
- `npm run check` - Run type checking, linting, and formatting

## Getting Started (Developers)

> Requires Node.js 22 or higher

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to start the development server
4. Open the provided playtest URL in your browser (e.g., `https://www.reddit.com/r/odyssey-protocol_dev?playtest=odyssey-protocol`)
5. Click "Launch App" on the post to open the app
6. Edit files in `src/client/` or `src/server/` - changes will hot-reload

## Project Structure

```
src/
├── client/              # React frontend
│   ├── components/      # UI components
│   │   ├── GalleryButton.tsx
│   │   ├── SavePatchButton.tsx
│   │   ├── GalleryModal.tsx
│   │   ├── GalleryGrid.tsx
│   │   ├── GalleryDetail.tsx
│   │   ├── LeaderboardButton.tsx
│   │   ├── LeaderboardModal.tsx
│   │   ├── LeaderboardRow.tsx
│   │   ├── TechTreeButton.tsx
│   │   ├── TechTreeModal.tsx
│   │   ├── UnlockNode.tsx
│   │   ├── MissionSelector.tsx
│   │   ├── PartSelector.tsx
│   │   ├── LockedMissionIndicator.tsx
│   │   ├── LockedPartIndicator.tsx
│   │   ├── ActiveEffectsDisplay.tsx
│   │   ├── SuggestMissionButton.tsx
│   │   ├── SuggestMissionModal.tsx
│   │   ├── SuggestionsModal.tsx
│   │   ├── SuggestionCard.tsx
│   │   ├── BallotButton.tsx
│   │   ├── BallotModal.tsx
│   │   ├── PromotedMissionBanner.tsx
│   │   ├── MissionDemo.tsx
│   │   ├── MissionHud.tsx
│   │   ├── StatBar.tsx
│   │   ├── CountdownTimer.tsx
│   │   ├── TimerPanel.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ToastContainer.tsx
│   ├── hooks/           # Custom React hooks
│   │   ├── useCounter.ts
│   │   ├── useGallery.ts
│   │   ├── useUnlocks.tsx
│   │   ├── useUnlockEffects.ts
│   │   ├── useToast.ts
│   │   ├── useRealtimeHud.ts
│   │   ├── useRealtimeTimer.ts
│   │   ├── useMissionSnapshot.ts
│   │   └── useFallbackPolling.ts
│   ├── utils/           # Utility functions
│   │   ├── missionData.ts
│   │   ├── unlockApi.ts
│   │   ├── unlockEffects.ts
│   │   ├── unlockFilters.ts
│   │   ├── gameActions.ts
│   │   ├── pointNotifications.ts
│   │   └── missionSuggestionApi.ts
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # React entry point
│   └── module.d.ts      # Type declarations (Devvit Realtime API)
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   │   ├── counter.ts
│   │   ├── gallery.ts
│   │   ├── leaderboard.ts
│   │   ├── unlock.ts
│   │   ├── game.ts
│   │   ├── missionSuggestions.ts
│   │   └── mission.ts
│   ├── services/        # Business logic
│   │   ├── galleryService.ts
│   │   ├── imageGenerator.ts
│   │   ├── leaderboard.ts
│   │   ├── unlock.ts
│   │   ├── missionSuggestions.ts
│   │   └── realtime.ts
│   ├── utils/           # Helper functions
│   │   ├── realtimeHelpers.ts
│   │   └── missionInit.ts
│   ├── data/            # Static data
│   │   └── unlockTree.ts
│   └── index.ts         # Server entry point
└── shared/              # Shared types
    └── types/
        ├── api.ts                  # Counter API types
        ├── gallery.ts              # Gallery API types
        ├── leaderboard.ts          # Leaderboard API types
        ├── unlock.ts               # Unlock system types
        ├── missionSuggestions.ts   # Mission suggestion types
        ├── realtime.ts             # Realtime message types
        └── mission.ts              # Mission snapshot types
```

## Development Roadmap

### ✅ Phase 1: Core Infrastructure (Complete)

**Devvit Foundation:**

- React + Express architecture with TypeScript
- Redis persistence layer
- Type-safe API contracts across client and server
- Toast notification system
- Error handling with React Error Boundaries
- Retry logic and graceful degradation

**Tech Tree System:**

- Science Points currency with atomic transactions
- 19-node unlock tree (4 engines, 4 fuel tanks, 5 missions, 4 bonuses)
- Prerequisite validation and dependency chains
- Redis WATCH/MULTI/EXEC for purchase transactions
- Visual tech tree UI with status indicators (🔒🔓✅)
- Effect system for gameplay modifiers
- Season-based resets with SP persistence

**Leaderboard System:**

- Point tracking with idempotency protection
- Seasonal competition with reset functionality
- Personal rank calculation (Redis ZRANK)
- Top N rankings with tie-breaking
- Ban/unban user functionality
- Moderator permission checks
- Atomic Redis operations for concurrent updates
- Bulk credit operations for mission completion

**Mission Gallery:**

- SVG patch generation system
- Gallery API (save, list, get, delete)
- Gallery UI (modal, grid, detail views)
- Pagination and storage limits (500 entries max)
- Moderator content curation

**Community-Proposed Missions:**

- Complete backend API for suggestions and ballots
- Full UI implementation with all modals and forms
- Suggestion submission with validation
- Idempotent voting system (up/down votes)
- Moderator curation (approve/reject)
- Ballot creation with 2-4 suggestions
- Automatic ballot closure via scheduled actions
- Winner determination and game integration
- Anti-abuse measures (banlist, submission caps)
- Pagination and filtering (status, sort order)
- Complete client API utilities (missionSuggestionApi.ts)

**Real-time HUD & Countdowns:**

- Devvit Realtime API integration (pub/sub)
- Live HUD updates for mission statistics
- Countdown timers with T−mm:ss format
- Drift correction using server timestamps
- Graceful fallback to 5-second polling
- Automatic reconnection with snapshot sync
- Server-side RealtimeService class
- Mission snapshot API endpoint
- Scheduled actions for timer enforcement
- Client hooks (useRealtimeHud, useRealtimeTimer, useMissionSnapshot, useFallbackPolling)
- UI components (MissionHud, StatBar, CountdownTimer, TimerPanel)
- Demo component (MissionDemo) for testing
- Complete integration documentation

**Demo Features:**

- Interactive counter with Redis persistence
- Mission HUD demo with live countdown

### 📋 Phase 2: Game Implementation (Planned)

**Rocket Design System:**

- Ship part selection (engines, fuel tanks, payload)
- Crew selection and management
- Design validation and constraints
- Visual rocket builder UI
- Integration with unlock filters (only show unlocked parts)

**Mission System:**

- Mission selection with unlock-based filtering
- Four mission phases: Planning → Launch → Flight → Result
- Resource management (fuel, hull integrity, crew morale)
- Event-driven mission progression
- Random events and challenges

**Voting Mechanics:**

- Community decision-making during missions
- Vote on critical choices (abort, continue, risk maneuvers)
- Decisive action tracking for leaderboard points
- Real-time vote tallying

**Gameplay Integration:**

- Apply unlock effects to missions (success chance, morale, fuel, science bonuses)
- Auto-award Science Points for mission outcomes
- Auto-award leaderboard points for participation and decisive actions
- Track mission participants for bulk credit
- Display point notifications during gameplay

**Content:**

- Multiple mission types (Lunar Orbit, Mars Flyby, Asteroid Survey, Jupiter Expedition, Deep Space Probe)
- Diverse events and scenarios
- Mission-specific challenges and rewards

**Community Mission Integration:**

- Integrate promoted mission data into game state
- Display promoted mission banner when available
- Use payload hints to influence mission mechanics

**Real-time Integration:**

- Call RealtimeService methods when stats change
- Publish HUD updates on fuel/hull/crew/success/science changes
- Start countdown timers when entering timed phases
- Publish phase transitions with full HUD snapshots
- Integrate timer expiration with phase progression starting new missions
- Apply payload hints to mission mechanics
- Mark ballots as "promoted" after game integration
- Clear promoted mission after use

### 🔮 Phase 3: Polish & Enhancement (Future)

- Advanced statistics and analytics
- Achievement system
- Mission replay/history viewer
- Enhanced moderator dashboard
- Community challenges and events
- Seasonal themes and special missions
