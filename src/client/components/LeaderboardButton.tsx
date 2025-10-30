interface LeaderboardButtonProps {
  onClick: () => void;
  className?: string;
}

export const LeaderboardButton = ({ onClick, className = '' }: LeaderboardButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ${className}`}
      aria-label="Open Leaderboard"
    >
      <span className="text-xl">🏆</span>
      <span>Leaderboard</span>
    </button>
  );
};
