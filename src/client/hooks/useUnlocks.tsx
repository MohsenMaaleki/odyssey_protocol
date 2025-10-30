/**
 * Unlock system context and state management
 * Provides unlock tree, purchased unlocks, and SP balance
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { UnlockTree, UnlockStatus, PurchaseResult } from '../../shared/types/unlock';
import { fetchUnlockTree, purchaseUnlock as apiPurchaseUnlock } from '../utils/unlockApi';

interface UnlockContextValue {
  tree: UnlockTree | null;
  status: UnlockStatus | null;
  loading: boolean;
  error: string | null;
  purchaseUnlock: (id: string) => Promise<PurchaseResult>;
  refresh: () => Promise<void>;
}

const UnlockContext = createContext<UnlockContextValue | undefined>(undefined);

interface UnlockProviderProps {
  children: ReactNode;
}

export function UnlockProvider({ children }: UnlockProviderProps) {
  const [tree, setTree] = useState<UnlockTree | null>(null);
  const [status, setStatus] = useState<UnlockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch unlock tree and status from server
   */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUnlockTree();
      setTree(data.tree);
      setStatus(data.status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load unlock data';
      setError(message);
      console.error('Error fetching unlock tree:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Purchase an unlock with optimistic updates
   */
  const purchaseUnlock = useCallback(
    async (id: string): Promise<PurchaseResult> => {
      if (!status || !tree) {
        return {
          ok: false,
          message: 'Unlock system not initialized',
        };
      }

      // Find the unlock node
      const node = tree.nodes.find((n) => n.id === id);
      if (!node) {
        return {
          ok: false,
          message: 'Unlock not found',
        };
      }

      // Optimistic update: temporarily update local state
      const previousStatus = { ...status };
      setStatus({
        ...status,
        total_science_points: status.total_science_points - node.cost,
        unlocks: [...status.unlocks, id],
      });

      try {
        // Make API call
        const result = await apiPurchaseUnlock(id);

        if (result.ok) {
          // Update with actual server response
          setStatus({
            ...status,
            total_science_points: result.new_sp ?? status.total_science_points - node.cost,
            unlocks: [...status.unlocks, id],
            unlock_meta: {
              ...status.unlock_meta,
              purchased_at: {
                ...status.unlock_meta.purchased_at,
                [id]: new Date().toISOString(),
              },
            },
          });
        } else {
          // Revert optimistic update on failure
          setStatus(previousStatus);
        }

        return result;
      } catch (err) {
        // Revert optimistic update on error
        setStatus(previousStatus);
        const message = err instanceof Error ? err.message : 'Purchase failed';
        return {
          ok: false,
          message,
        };
      }
    },
    [status, tree]
  );

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: UnlockContextValue = {
    tree,
    status,
    loading,
    error,
    purchaseUnlock,
    refresh,
  };

  return <UnlockContext.Provider value={value}>{children}</UnlockContext.Provider>;
}

/**
 * Hook to access unlock context
 */
export function useUnlocks(): UnlockContextValue {
  const context = useContext(UnlockContext);
  if (context === undefined) {
    throw new Error('useUnlocks must be used within an UnlockProvider');
  }
  return context;
}
