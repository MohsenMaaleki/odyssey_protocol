/**
 * useVoting - Hook for managing vote state and actions
 */

import { useState, useEffect, useCallback } from 'react';
import type { VoteWindow, VoteTallies, VoteOptionId, VotePhase } from '../../shared/types/mission';

interface VoteState {
  window: VoteWindow | null;
  tallies: VoteTallies | null;
  serverNow: string;
  loading: boolean;
  error: string | null;
}

export function useVoting() {
  const [state, setState] = useState<VoteState>({
    window: null,
    tallies: null,
    serverNow: new Date().toISOString(),
    loading: false,
    error: null,
  });

  // Fetch current vote state
  const fetchVoteState = useCallback(async () => {
    try {
      const res = await fetch('/api/mission/vote-state');
      const json = await res.json();
      
      if (json.ok) {
        setState(prev => ({
          ...prev,
          window: json.data.window,
          tallies: json.data.tallies,
          serverNow: json.data.server_now,
          error: null,
        }));
      } else {
        setState(prev => ({ ...prev, error: json.error }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to fetch vote state' }));
    }
  }, []);

  // Open a vote
  const openVote = useCallback(async (phase: VotePhase, options: VoteOptionId[], durationSec: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/mission/open-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase, options, durationSec }),
      });
      const json = await res.json();
      
      if (json.ok) {
        setState(prev => ({
          ...prev,
          window: json.data.window,
          tallies: json.data.tallies,
          serverNow: json.data.server_now,
          loading: false,
        }));
        return true;
      } else {
        setState(prev => ({ ...prev, error: json.error, loading: false }));
        return false;
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to open vote', loading: false }));
      return false;
    }
  }, []);

  // Cast a vote
  const castVote = useCallback(async (optionId: VoteOptionId) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/mission/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      });
      const json = await res.json();
      
      if (json.ok) {
        setState(prev => ({
          ...prev,
          window: json.data.window,
          tallies: json.data.tallies,
          serverNow: json.data.server_now,
          loading: false,
        }));
        return true;
      } else {
        setState(prev => ({ ...prev, error: json.error, loading: false }));
        return false;
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to cast vote', loading: false }));
      return false;
    }
  }, []);

  // Close vote
  const closeVote = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/mission/close-vote', {
        method: 'POST',
      });
      const json = await res.json();
      
      if (json.ok) {
        setState(prev => ({
          ...prev,
          window: json.data.window,
          tallies: json.data.tallies,
          serverNow: json.data.server_now,
          loading: false,
        }));
        return true;
      } else {
        setState(prev => ({ ...prev, error: json.error, loading: false }));
        return false;
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to close vote', loading: false }));
      return false;
    }
  }, []);

  // Poll for updates
  useEffect(() => {
    if (state.window && state.window.status === 'open') {
      const interval = setInterval(fetchVoteState, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [state.window, fetchVoteState]);

  return {
    ...state,
    openVote,
    castVote,
    closeVote,
    refresh: fetchVoteState,
  };
}
