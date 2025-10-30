interface BallotButtonProps {
  onClick: () => void;
  className?: string;
}

export const BallotButton = ({ onClick, className = '' }: BallotButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors ${className}`}
    >
      🗳️ View Ballot
    </button>
  );
};
