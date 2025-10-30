import { useState, useEffect } from 'react';
import type { PromotedMission } from '../../shared/types/missionSuggestions';
import { getPromotedMission } from '../utils/missionSuggestionApi';

/**
 * Hook for fetching and caching the promoted mission
 * Returns the promoted mission data and loading state
 */
export function usePromotedMission() {
  const [promotedMission, setPromotedMission] = useState<PromotedMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPromotedMission = async () => {
      try {
        const response = await getPromotedMission();

        if (isMounted) {
          if (response.ok && response.data) {
            setPromotedMission(response.data);
            setError(null);
          } else {
            setPromotedMission(null);
            setError(response.message || 'Failed to fetch promoted mission');
          }
        }
      } catch (err) {
        if (isMounted) {
          setPromotedMission(null);
          setError('Error fetching promoted mission');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPromotedMission();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    promotedMission,
    loading,
    error,
  };
}
