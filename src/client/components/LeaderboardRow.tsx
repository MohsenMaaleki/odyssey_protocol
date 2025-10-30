interface LeaderboardRowProps {
  rank: number;
  username: string;
  points: number;
  isCurrentUser?: boolean;
}

const getRankBadge = (rank: number): string => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return rank <= 10 ? '🎖' : '';
  }
};

export const LeaderboardRow = ({
  rank,
  username,
  points,
  isCurrentUser = false,
}: LeaderboardRowProps) => {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
        isCurrentUser ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-gray-600 font-semibold min-w-[2rem]">#{rank}</span>
        <span className="text-xl">{getRankBadge(rank)}</span>
        <span
          className={`font-medium ${isCurrentUser ? 'text-blue-700 font-bold' : 'text-gray-900'}`}
        >
          {username}
          {isCurrentUser && <span className="ml-2 text-sm text-blue-600">(You)</span>}
        </span>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold text-gray-900">{points}</span>
        <span className="text-sm text-gray-500 ml-1">pts</span>
      </div>
    </div>
  );
};
