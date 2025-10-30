interface GalleryButtonProps {
  onClick: () => void;
  className?: string;
}

export const GalleryButton = ({ onClick, className = '' }: GalleryButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors ${className}`}
    >
      Open Mission Gallery
    </button>
  );
};
