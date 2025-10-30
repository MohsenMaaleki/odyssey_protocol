import type { Suggestion, VoteValue } from '../../shared/types/missionSuggestions';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onVote: (id: string, value: VoteValue) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showModControls: boolean;
  currentUserVote?: VoteValue;
}

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

const getRiskColor = (risk: string): string => {
  switch (risk) {
    case 'Low':
      return 'text-green-600 bg-green-50';
    case 'Medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'High':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getRewardIcon = (reward: string): string => {
  switch (reward) {
    case 'Science':
      return '🧪';
    case 'Unlock':
      return '🔓';
    case 'Prestige':
      return '⭐';
    default:
      return '🎁';
  }
};

const getStatusBadge = (status: string): { text: string; color: string } => {
  switch (status) {
    case 'pending':
      return { text: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
    case 'approved':
      return { text: 'Approved', color: 'bg-green-100 text-green-700' };
    case 'rejected':
      return { text: 'Rejected', color: 'bg-red-100 text-red-700' };
    case 'archived':
      return { text: 'Archived', color: 'bg-gray-100 text-gray-700' };
    default:
      return { text: status, color: 'bg-gray-100 text-gray-700' };
  }
};

export const SuggestionCard = ({
  suggestion,
  onVote,
  onApprove,
  onReject,
  showModControls,
  currentUserVote = 0,
}: SuggestionCardProps) => {
  const voteScore = suggestion.votes.up - suggestion.votes.down;
  const statusBadge = getStatusBadge(suggestion.status);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      {/* Header with ID and Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">{suggestion.id}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>
        <span className="text-xs text-gray-500">{formatDate(suggestion.created_at)}</span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-2">{suggestion.title}</h3>

      {/* Mission Details */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-600">🎯</span>
          <span className="font-medium text-gray-700">{suggestion.target}</span>
        </div>
        <div className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded ${getRiskColor(suggestion.risk)}`}>
          <span>⚠️</span>
          <span className="font-medium">{suggestion.risk} Risk</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span>{getRewardIcon(suggestion.reward)}</span>
          <span className="font-medium text-gray-700">{suggestion.reward}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span>📦</span>
          <span className="font-medium">{suggestion.payload_hint}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">{suggestion.description}</p>

      {/* Footer with Proposer and Voting */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          by <span className="font-medium text-gray-900">{suggestion.proposer}</span>
        </div>

        {/* Voting Controls */}
        <div className="flex items-center gap-3">
          {/* Vote Score Display */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">↑ {suggestion.votes.up}</span>
            <span className={`font-bold ${voteScore > 0 ? 'text-green-600' : voteScore < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {voteScore > 0 ? '+' : ''}{voteScore}
            </span>
            <span className="text-gray-500">↓ {suggestion.votes.down}</span>
          </div>

          {/* Vote Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onVote(suggestion.id, currentUserVote === 1 ? 0 : 1)}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                currentUserVote === 1
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'
              }`}
              title="Upvote"
            >
              ↑
            </button>
            <button
              onClick={() => onVote(suggestion.id, currentUserVote === -1 ? 0 : -1)}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                currentUserVote === -1
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
              }`}
              title="Downvote"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      {/* Moderator Controls */}
      {showModControls && (onApprove || onReject) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
          {onApprove && suggestion.status !== 'approved' && (
            <button
              onClick={() => {
                console.log('[SuggestionCard] Approve button clicked for:', suggestion.id);
                console.log('[SuggestionCard] onApprove function:', typeof onApprove);
                onApprove(suggestion.id);
              }}
              className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              ✓ Approve
            </button>
          )}
          {onReject && suggestion.status !== 'rejected' && (
            <button
              onClick={() => {
                console.log('[SuggestionCard] Reject button clicked for:', suggestion.id);
                console.log('[SuggestionCard] onReject function:', typeof onReject);
                onReject(suggestion.id);
              }}
              className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              ✗ Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
};
