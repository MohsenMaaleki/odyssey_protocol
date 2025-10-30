import type { Suggestion } from '../../shared/types/missionSuggestions';

interface PromotedMissionBannerProps {
  suggestion: Suggestion;
  onUse: () => void;
  onDismiss: () => void;
}

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

export const PromotedMissionBanner = ({
  suggestion,
  onUse,
  onDismiss,
}: PromotedMissionBannerProps) => {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-4 shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <div>
            <h3 className="text-lg font-bold">Community Chose This Mission!</h3>
            <p className="text-sm text-purple-100">The community voted for this mission</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-white hover:text-purple-200 text-xl font-bold"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="bg-white bg-opacity-10 rounded-lg p-3 mb-3">
        <h4 className="text-xl font-bold mb-2">{suggestion.title}</h4>
        <p className="text-sm text-purple-100 mb-3">{suggestion.description}</p>

        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-1 text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
            <span>🎯</span>
            <span className="font-medium">{suggestion.target}</span>
          </div>
          <div
            className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${getRiskColor(suggestion.risk)}`}
          >
            <span>⚠️</span>
            <span className="font-medium">{suggestion.risk} Risk</span>
          </div>
          <div className="flex items-center gap-1 text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
            <span>{getRewardIcon(suggestion.reward)}</span>
            <span className="font-medium">{suggestion.reward}</span>
          </div>
          <div className="flex items-center gap-1 text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
            <span>📦</span>
            <span className="font-medium">{suggestion.payload_hint}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onUse}
          className="flex-1 px-4 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
        >
          Use This Mission
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-white bg-opacity-20 text-white font-semibold rounded-lg hover:bg-opacity-30 transition-colors"
        >
          Choose Different
        </button>
      </div>
    </div>
  );
};
