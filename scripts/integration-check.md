# 15-Minute Integration Checklist

## Status Check Results

### ✅ 1. Tech Tree Endpoint
**Route Mounted:** YES - `app.use(unlockRouter)` in `src/server/index.ts:365`
**Storage Initialized:** YES - `UnlockService` initialized on app install
**Permissions:** Configured in `devvit.json` - `redis: true`

**Test Command:**
```bash
# In browser console on your app:
fetch('/api/unlocks/tree').then(r => r.json()).then(console.log)
```

**Expected:** JSON with unlock tree structure

**Quick Fix if 404:**
- Check route is mounted: `app.use(unlockRouter)`
- Check handler exists in `src/server/routes/unlock.ts`

---

### ✅ 2. Gallery Image Upload
**Service:** `GalleryService` in `src/server/services/gallery.ts`
**Media API:** Uses Devvit `media` client
**Image Generator:** `src/server/services/imageGenerator.ts`

**Test Command:**
```bash
# Complete a mission and click "Save Mission Patch"
# Check browser console for image_url
```

**Expected:** Image URL returned and displayed in gallery

**Quick Fix if null:**
```typescript
// In imageGenerator.ts, ensure uploadImage returns URL:
const uploadResult = await media.upload({ data: buffer, type: 'image/svg+xml' });
return uploadResult.mediaUrl; // Must return URL, not ID
```

---

### ✅ 3. Leaderboard Integration
**Service:** `LeaderboardService` in `src/server/services/leaderboard.ts`
**Initialized:** YES - on app install
**Credit Methods:**
- `creditDecisive()` - Awards ACTION_DECISIVE points
- `bulkCreditParticipants()` - Awards participation points

**Test Flow:**
1. Start mission (IDLE → DESIGN)
2. Build rocket
3. Finalize design (DESIGN → LAUNCH)
4. Launch (LAUNCH → FLIGHT or RESULT)
5. If FLIGHT: perform action (FLIGHT → RESULT)
6. Acknowledge (awards points)
7. Open leaderboard - verify your username appears

**Expected Points:**
- Decisive action: 50 points
- Participation: 10 points
- Mission success: 100 points

**Quick Fix if not appearing:**
```typescript
// In mission.ts acknowledge():
await this.leaderboard.creditDecisive(p.mission_id!, p.decisive_actions);
await this.leaderboard.bulkCreditParticipants(p.mission_id!, p.participants, reason);
```

---

### ✅ 4. Voting System (Phase 2)
**Endpoints:**
- `POST /api/mission/open-vote` ✅
- `POST /api/mission/vote` ✅
- `POST /api/mission/close-vote` ✅
- `GET /api/mission/vote-state` ✅

**Test Flow:**
1. Start mission and enter DESIGN phase
2. Open vote:
```javascript
fetch('/api/mission/open-vote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phase: 'DESIGN',
    options: ['finalize_design', 'add_more_fuel'],
    durationSec: 120
  })
}).then(r => r.json()).then(console.log)
```

3. Cast vote:
```javascript
fetch('/api/mission/vote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ optionId: 'finalize_design' })
}).then(r => r.json()).then(console.log)
```

4. Wait for auto-close or manually close:
```javascript
fetch('/api/mission/close-vote', {
  method: 'POST'
}).then(r => r.json()).then(console.log)
```

**Expected:**
- Vote opens with countdown
- Tallies update when votes cast
- Winner determined on close
- Winning action applied to mission
- Decisive credit to winning voters

---

## Common Issues & Quick Fixes

### Issue: "Failed to fetch unlock tree"
**Cause:** Route not mounted or storage not initialized

**Fix:**
```typescript
// In src/server/index.ts
app.use(unlockRouter); // Ensure this line exists

// In onAppInstall handler
const unlockService = new UnlockService(redis, reddit, context);
await redis.set('unlock:season', '1'); // Initialize season
```

---

### Issue: "Gallery image unavailable"
**Cause:** Image upload returns null or wrong format

**Fix:**
```typescript
// In src/server/services/imageGenerator.ts
export async function uploadImage(svg: string, format: string, media: any): Promise<string> {
  const buffer = Buffer.from(svg, 'utf-8');
  
  const result = await media.upload({
    data: buffer,
    type: 'image/svg+xml',
  });
  
  // IMPORTANT: Return the URL, not the ID
  return result.mediaUrl; // or result.url depending on Devvit version
}
```

**Alternative (data URI for quick test):**
```typescript
// Return data URI instead of uploading
return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
```

---

### Issue: "Leaderboard empty after mission"
**Cause:** Points not awarded in acknowledge handler

**Fix:**
```typescript
// In src/server/services/mission.ts - acknowledge()
async acknowledge(username: string) {
  const p = await this.postData.read();
  this.assertPhase(p, 'RESULT');

  const delta = p.science_points_delta ?? 0;
  
  // Award Science Points
  if (delta > 0) {
    await this.unlocks.addSciencePointsGlobal(delta);
  }

  // Award Leaderboard Points - CRITICAL
  if (p.decisive_actions.length > 0) {
    await this.leaderboard.creditDecisive(p.mission_id!, p.decisive_actions);
  }

  const reason = p.outcome === 'success' ? 'MISSION_SUCCESS' : 
                 p.outcome === 'fail' ? 'MISSION_FAIL' : 'MISSION_ABORT';

  if (p.participants.length > 0) {
    await this.leaderboard.bulkCreditParticipants(p.mission_id!, p.participants, reason);
  }

  return p;
}
```

---

### Issue: "Vote doesn't close automatically"
**Cause:** Scheduler not configured or not calling endpoint

**Fix:**
```typescript
// In src/server/utils/missionInit.ts
scheduleVoteCloseAt: async (missionId: string, atIso: string) => {
  const jobId = `voteclose:${postId}:${missionId}:${Date.parse(atIso)}`;
  console.log(`[Schedule] Would schedule ${jobId} at ${atIso}`);
  
  // TODO: Implement actual Devvit Scheduled Action
  // await scheduler.runAt({ 
  //   id: jobId, 
  //   at: atIso, 
  //   route: "/api/mission/close-vote", 
  //   body: { missionId } 
  // });
}
```

**Current Status:** Logs only - manual close required for now

---

## Verification Commands

### Check All Routes
```bash
# In browser console
const routes = [
  '/api/unlocks/tree',
  '/api/unlocks/status',
  '/api/gallery/list',
  '/api/leaderboard/top',
  '/api/mission/snapshot',
  '/api/mission/vote-state'
];

routes.forEach(route => {
  fetch(route)
    .then(r => r.json())
    .then(data => console.log(route, '✅', data))
    .catch(err => console.error(route, '❌', err));
});
```

### Check Storage Keys
```bash
# Via Devvit logs
devvit logs odyssey_protocol_dev --follow
```

Look for:
- `Gallery storage initialized`
- `Leaderboard storage initialized`
- `Unlock storage initialized`
- `Mission suggestions storage initialized`

---

## Success Criteria

✅ **Tech Tree:** Returns JSON tree structure  
✅ **Gallery:** Images upload and display  
✅ **Leaderboard:** Points awarded and displayed  
✅ **Voting:** Votes cast, tallied, and winner applied  
✅ **Mission Flow:** Complete IDLE → RESULT works  
✅ **Storage:** All services initialized  

---

## Current Deployment Status

**Version:** 0.0.8  
**Subreddit:** r/odyssey_protocol_dev  
**Status:** Live  

**All routes mounted:** ✅  
**Storage initialized:** ✅  
**Phase 2 backend:** ✅  
**Phase 2 UI components:** ✅  

**Ready for integration testing!** 🚀
