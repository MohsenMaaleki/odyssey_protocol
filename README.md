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

- Advanced statistics and analytics
- Achievement system
- Mission replay/history viewer
- Enhanced moderator dashboard
- Community challenges and events
- Seasonal themes and special missions
