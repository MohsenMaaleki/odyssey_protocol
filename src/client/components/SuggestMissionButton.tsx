interface SuggestMissionButtonProps {
  onClick: () => void;
  className?: string;
}

export const SuggestMissionButton = ({ onClick, className = '' }: SuggestMissionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors ${className}`}
    >
      💡 Suggest Mission
    </button>
  );
};
