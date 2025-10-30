import { useCallback, useState } from 'react';
import type {
  GalleryEntry,
  SavePatchRequest,
  SavePatchResponse,
  ListGalleryResponse,
  GetGalleryItemResponse,
  DeleteGalleryItemResponse,
} from '../../shared/types/gallery';

interface GalleryState {
  entries: GalleryEntry[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  total: number;
}

export interface UseGalleryReturn {
  entries: GalleryEntry[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  total: number;
  savePatch: (missionData: SavePatchRequest) => Promise<GalleryEntry | null>;
  loadGallery: (page?: number) => Promise<void>;
  getEntry: (id: string) => Promise<GalleryEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  nextPage: () => void;
  prevPage: () => void;
}

export const useGallery = (): UseGalleryReturn => {
  const [state, setState] = useState<GalleryState>({
    entries: [],
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    total: 0,
  });

  // Save a mission patch
  const savePatch = useCallback(
    async (missionData: SavePatchRequest): Promise<GalleryEntry | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const res = await fetch('/api/gallery/save-patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(missionData),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data: SavePatchResponse = await res.json();

        if (data.status === 'error') {
          throw new Error(data.message);
        }

        setState((prev) => ({ ...prev, loading: false }));
        return data.entry || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save mission patch';
        console.error('Failed to save patch:', err);
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        return null;
      }
    },
    []
  );

  // Load gallery entries with pagination
  const loadGallery = useCallback(async (page: number = 1): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const perPage = 12;
      const res = await fetch(`/api/gallery/list?page=${page}&perPage=${perPage}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: ListGalleryResponse = await res.json();

      if (data.status === 'error') {
        throw new Error('Failed to load gallery');
      }

      setState({
        entries: data.entries,
        loading: false,
        error: null,
        currentPage: data.page,
        totalPages: data.totalPages,
        total: data.total,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load gallery';
      console.error('Failed to load gallery:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        entries: [],
      }));
    }
  }, []);

  // Get a single gallery entry by ID
  const getEntry = useCallback(async (id: string): Promise<GalleryEntry | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`/api/gallery/item/${id}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Gallery entry not found');
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: GetGalleryItemResponse = await res.json();

      if (data.status === 'error') {
        throw new Error(data.message || 'Failed to get gallery entry');
      }

      setState((prev) => ({ ...prev, loading: false }));
      return data.entry || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get gallery entry';
      console.error('Failed to get entry:', err);
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, []);

  // Delete a gallery entry (moderators only)
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`/api/gallery/item/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('You do not have permission to delete this entry');
        }
        if (res.status === 404) {
          throw new Error('Gallery entry not found');
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: DeleteGalleryItemResponse = await res.json();

      if (data.status === 'error') {
        throw new Error(data.message);
      }

      // Remove the deleted entry from the current state
      setState((prev) => ({
        ...prev,
        loading: false,
        entries: prev.entries.filter((entry) => entry.id !== id),
        total: prev.total - 1,
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete gallery entry';
      console.error('Failed to delete entry:', err);
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      return false;
    }
  }, []);

  // Navigate to next page
  const nextPage = useCallback(() => {
    setState((prev) => {
      if (prev.currentPage < prev.totalPages) {
        const newPage = prev.currentPage + 1;
        // Trigger load in the next tick
        setTimeout(() => loadGallery(newPage), 0);
        return prev;
      }
      return prev;
    });
  }, [loadGallery]);

  // Navigate to previous page
  const prevPage = useCallback(() => {
    setState((prev) => {
      if (prev.currentPage > 1) {
        const newPage = prev.currentPage - 1;
        // Trigger load in the next tick
        setTimeout(() => loadGallery(newPage), 0);
        return prev;
      }
      return prev;
    });
  }, [loadGallery]);

  return {
    entries: state.entries,
    loading: state.loading,
    error: state.error,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    total: state.total,
    savePatch,
    loadGallery,
    getEntry,
    deleteEntry,
    nextPage,
    prevPage,
  };
};
