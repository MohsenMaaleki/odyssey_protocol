import { useEffect, useState } from 'react';
import type { GalleryEntry } from '../../shared/types/gallery';
import { GalleryGrid } from './GalleryGrid';
import { GalleryDetail } from './GalleryDetail';
import { useGallery } from '../hooks/useGallery';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'grid' | 'detail';
  initialEntryId?: string;
  isModerator?: boolean;
}

export const GalleryModal = ({
  isOpen,
  onClose,
  initialView = 'grid',
  initialEntryId,
  isModerator = false,
}: GalleryModalProps) => {
  const [view, setView] = useState<'grid' | 'detail'>(initialView);
  const [selectedEntry, setSelectedEntry] = useState<GalleryEntry | null>(null);

  const { entries, loading, error, currentPage, totalPages, loadGallery, getEntry, deleteEntry } =
    useGallery();

  // Load gallery when modal opens
  useEffect(() => {
    if (isOpen && view === 'grid') {
      loadGallery(currentPage);
    }
  }, [isOpen, view, currentPage, loadGallery]);

  // Load initial entry if provided
  useEffect(() => {
    if (isOpen && initialEntryId && initialView === 'detail') {
      getEntry(initialEntryId).then((entry) => {
        if (entry) {
          setSelectedEntry(entry);
          setView('detail');
        }
      });
    }
  }, [isOpen, initialEntryId, initialView, getEntry]);

  const handleSelectEntry = (entry: GalleryEntry) => {
    setSelectedEntry(entry);
    setView('detail');
  };

  const handleBackToGrid = () => {
    setSelectedEntry(null);
    setView('grid');
    loadGallery(currentPage);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteEntry(id);
    if (success) {
      handleBackToGrid();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          aria-label="Close"
        >
          ×
        </button>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[90vh]">
          {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

          {view === 'grid' && (
            <GalleryGrid
              entries={entries}
              onSelectEntry={handleSelectEntry}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={loadGallery}
              loading={loading}
            />
          )}

          {view === 'detail' && selectedEntry && (
            <GalleryDetail
              entry={selectedEntry}
              onClose={handleBackToGrid}
              onDelete={handleDelete}
              isModerator={isModerator}
            />
          )}
        </div>
      </div>
    </div>
  );
};
