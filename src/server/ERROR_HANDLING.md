# Error Handling and Logging Implementation

This document describes the comprehensive error handling and logging system implemented for the realtime HUD and countdown features.

## Server-Side Error Handling

### RealtimeService Error Handling

All methods in `RealtimeService` include:

1. **Try-catch blocks** around all realtime publish operations
2. **Timestamped logging** with ISO 8601 timestamps for debugging
3. **Structured error logging** with mission_id, error message, and stack traces
4. **Contextual information** in error logs (timer kind, duration, job names, etc.)

#### Example Error Log Format

```typescript
console.error(
  `[Realtime] [2025-10-29T12:34:56.789Z] Failed to publish HUD update for mission abc123:`,
  {
    error: 'Connection timeout',
    stack: '...',
    hudData: { fuel: 50, hull: 75 },
    full: false,
  }
);
```

### Scheduled Action Error Handling

The `/internal/scheduler/process-timers` endpoint includes:

1. **Top-level try-catch** for entire scheduler execution
2. **Per-mission error handling** to prevent one mission failure from blocking others
3. **Per-job error handling** to process as many jobs as possible
4. **Error counting** to track failure rates
5. **Detailed error logging** with timestamps and context

### Helper Functions Error Handling

The `realtimeHelpers.ts` module includes:

1. **Non-critical operations** (HUD updates) catch errors and log without throwing
2. **Critical operations** (timer management) catch, log, and re-throw errors
3. **Consistent logging format** across all helper functions

## Client-Side Error Handling

### Error Boundary Component

Created `ErrorBoundary.tsx` component that:

1. **Catches React component errors** using `componentDidCatch`
2. **Logs errors with timestamps** and component stack traces
3. **Provides fallback UI** with optional custom fallback
4. **Allows recovery** with "Try Again" button
5. **Identifies component** with optional `componentName` prop

#### Usage Example

```typescript
<ErrorBoundary
  componentName="Mission HUD"
  fallback={<div>Unable to load mission status</div>}
>
  <MissionHudContent {...props} />
</ErrorBoundary>
```

### Hook Error Handling

Both `useRealtimeHud` and `useRealtimeTimer` hooks include:

1. **Timestamped logging** for all connection state changes
2. **Try-catch blocks** around subscription operations
3. **Error logging** for failed snapshot requests
4. **Graceful cleanup** with error handling in unsubscribe
5. **Fallback mode detection** with clear logging

#### Connection State Logging

```typescript
// Connection established
console.log(`[useRealtimeHud] [2025-10-29T12:34:56.789Z] Connected to rt:mission:abc123:hud`);

// Connection lost
console.log(`[useRealtimeHud] [2025-10-29T12:34:56.789Z] Disconnected from rt:mission:abc123:hud`);

// Fallback mode
console.warn(`[useRealtimeHud] [2025-10-29T12:34:56.789Z] Realtime not available, using fallback mode`);
```

### Component Error Boundaries

Both `MissionHud` and `CountdownTimer` are wrapped with error boundaries:

1. **MissionHud**: Shows error message if HUD fails to load
2. **CountdownTimer**: Silently fails (returns null) to prevent disrupting gameplay

## Error Categories

### Critical Errors (Throw)

These errors are re-thrown after logging:

- Timer start failures
- Timer pause/resume failures
- Redis write failures for timer deadlines
- Scheduled job creation failures

### Non-Critical Errors (Log Only)

These errors are logged but not thrown:

- HUD update publish failures (state persists in PostData)
- Timer end publish failures (already ended)
- Snapshot fetch failures on reconnection (will retry)

## Logging Standards

### Log Levels

- **console.log**: Normal operations (connections, successful publishes)
- **console.warn**: Degraded mode (fallback mode, realtime unavailable)
- **console.error**: Errors and failures

### Log Format

All logs include:

1. **Prefix**: `[Component]` (e.g., `[Realtime]`, `[useRealtimeHud]`, `[Scheduler]`)
2. **Timestamp**: ISO 8601 format in brackets `[2025-10-29T12:34:56.789Z]`
3. **Message**: Clear description of the event
4. **Context**: Structured object with relevant data

### Example Logs

```typescript
// Success
console.log(
  `[Realtime] [2025-10-29T12:34:56.789Z] Started countdown for mission abc123`,
  { kind: 'LAUNCH', durationMs: 30000, endsAt: '2025-10-29T12:35:26.789Z' }
);

// Error
console.error(
  `[Realtime] [2025-10-29T12:34:56.789Z] Failed to start countdown for mission abc123:`,
  {
    error: 'Redis connection timeout',
    stack: '...',
    timerKind: 'LAUNCH',
    durationMs: 30000,
  }
);
```

## Debugging Guide

### Finding Errors

1. **Search by mission ID**: `grep "mission abc123" logs`
2. **Search by timestamp**: `grep "2025-10-29T12:34" logs`
3. **Search by component**: `grep "[Realtime]" logs`
4. **Search by error type**: `grep "Failed to" logs`

### Common Error Scenarios

#### Realtime Publish Failure

```
[Realtime] [timestamp] Failed to publish HUD update for mission abc123:
  error: "Connection timeout"
  hudData: {...}
```

**Resolution**: Check realtime service availability, verify mission ID exists

#### Timer Scheduling Failure

```
[Realtime] [timestamp] Failed to start countdown for mission abc123:
  error: "Redis write failed"
  timerKind: "LAUNCH"
```

**Resolution**: Check Redis connectivity, verify PostData structure

#### Client Connection Failure

```
[useRealtimeHud] [timestamp] Error subscribing to realtime:
  error: "Subscription failed"
  missionId: "abc123"
```

**Resolution**: Check realtime availability, verify topic permissions

## Testing Error Handling

### Server-Side Tests

1. Mock Redis failures to test error logging
2. Mock realtime.send failures to test publish error handling
3. Test scheduled action error recovery

### Client-Side Tests

1. Trigger component errors to test error boundary
2. Simulate connection failures to test fallback mode
3. Test error recovery with "Try Again" button

## Monitoring Recommendations

1. **Track error rates** by component and error type
2. **Alert on critical errors** (timer failures, Redis failures)
3. **Monitor connection state changes** for realtime availability
4. **Track fallback mode usage** to identify realtime issues
5. **Monitor scheduled action failures** for timer processing issues

## Future Improvements

1. **Error aggregation**: Group similar errors to reduce log noise
2. **Retry logic**: Automatic retry for transient failures
3. **Circuit breaker**: Disable realtime temporarily after repeated failures
4. **User notifications**: Show toast messages for critical errors
5. **Error reporting**: Send errors to monitoring service (e.g., Sentry)
