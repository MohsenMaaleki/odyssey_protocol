/**
 * Tech Tree Button Component
 * Button to open the tech tree modal
 */

interface TechTreeButtonProps {
  onClick: () => void;
}

export const TechTreeButton = ({ onClick }: TechTreeButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md flex items-center gap-2"
    >
      <span className="text-xl">🔬</span>
      <span>Tech Tree</span>
    </button>
  );
};
