import type { GalleryEntry } from '../../shared/types/gallery';

interface GalleryGridProps {
  entries: GalleryEntry[];
  onSelectEntry: (entry: GalleryEntry) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const getOutcomeEmoji = (outcome: string): string => {
  switch (outcome) {
    case 'success':
      return '✅';
    case 'fail':
      return '❌';
    case 'abort':
      return '🟥';
    default:
      return '❓';
  }
};

export const GalleryGrid = ({
  entries,
  onSelectEntry,
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
}: GalleryGridProps) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-xl text-gray-600">Loading gallery...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-xl text-gray-600 mb-2">No mission patches yet</div>
        <div className="text-sm text-gray-500">Complete a mission and save your first patch!</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 text-center">Mission Gallery</h2>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            onClick={() => onSelectEntry(entry)}
            className="cursor-pointer bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all"
          >
            {/* Image */}
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {entry.image_url ? (
                <img
                  src={entry.image_url}
                  alt={entry.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML =
                      '<div class="text-gray-400 text-4xl">🖼️</div>';
                  }}
                />
              ) : (
                <div className="text-gray-400 text-4xl">🖼️</div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-1">
              <div className="font-semibold text-sm text-gray-900 truncate" title={entry.title}>
                {entry.title}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-2xl">{getOutcomeEmoji(entry.outcome)}</span>
                <span className="text-gray-600">🧪 {entry.science_points}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-700 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
