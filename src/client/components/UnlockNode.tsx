/**
 * UnlockNode Component
 * Displays individual unlock node with status, cost, and purchase button
 */

import type { UnlockNode as UnlockNodeType } from '../../shared/types/unlock';

interface UnlockNodeProps {
  node: UnlockNodeType;
  status: 'locked' | 'available' | 'purchased';
  onPurchase: (id: string) => void;
  purchasedUnlocks: string[];
}

export const UnlockNode = ({ node, status, onPurchase, purchasedUnlocks }: UnlockNodeProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'purchased':
        return 'bg-green-50 border-green-300';
      case 'available':
        return 'bg-blue-50 border-blue-300';
      case 'locked':
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'purchased':
        return '✅';
      case 'available':
        return '🔓';
      case 'locked':
        return '🔒';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'purchased':
        return 'Purchased';
      case 'available':
        return 'Available';
      case 'locked':
        return 'Locked';
    }
  };

  const getMissingPrereqs = () => {
    return node.prereq.filter((prereq) => !purchasedUnlocks.includes(prereq));
  };

  const formatEffect = (key: string, value: number) => {
    const prefix = value > 0 ? '+' : '';
    switch (key) {
      case 'successChance':
        return `${prefix}${value}% Success`;
      case 'morale':
        return `${prefix}${value} Morale`;
      case 'maxFuel':
        return `${prefix}${value} Max Fuel`;
      case 'scienceBonus':
        return `${prefix}${value}% Science`;
      default:
        return `${prefix}${value} ${key}`;
    }
  };

  return (
    <div
      className={`border-2 rounded-lg p-4 transition-all ${getStatusColor()} ${
        status === 'locked' ? 'opacity-60' : ''
      }`}
    >
      {/* Header with status icon */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-lg">{node.label}</h4>
          <div className="text-sm text-gray-600 mt-1">
            <span className="mr-2">{getStatusIcon()}</span>
            <span className="font-medium">{getStatusText()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Cost</div>
          <div className="font-bold text-blue-600 flex items-center gap-1">
            <span className="text-lg">⚗️</span>
            {node.cost}
          </div>
        </div>
      </div>

      {/* Description */}
      {node.description && (
        <p className="text-sm text-gray-700 mb-3">{node.description}</p>
      )}

      {/* Effects */}
      {node.effect && Object.keys(node.effect).length > 0 && (
        <div className="mb-3 space-y-1">
          <div className="text-xs font-semibold text-gray-600 uppercase">Effects</div>
          {Object.entries(node.effect).map(([key, value]) => (
            <div key={key} className="text-sm text-gray-700 flex items-center gap-1">
              <span className="text-purple-600">▸</span>
              {formatEffect(key, value)}
            </div>
          ))}
        </div>
      )}

      {/* Prerequisites */}
      {node.prereq.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
            Prerequisites
          </div>
          <div className="space-y-1">
            {node.prereq.map((prereq) => {
              const isMet = purchasedUnlocks.includes(prereq);
              return (
                <div
                  key={prereq}
                  className={`text-sm flex items-center gap-1 ${
                    isMet ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <span>{isMet ? '✓' : '✗'}</span>
                  <span className="font-mono text-xs">{prereq}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Purchase Button */}
      {status === 'available' && (
        <button
          onClick={() => onPurchase(node.id)}
          className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Purchase
        </button>
      )}

      {status === 'locked' && getMissingPrereqs().length > 0 && (
        <div className="text-xs text-gray-500 italic">
          Requires: {getMissingPrereqs().join(', ')}
        </div>
      )}

      {status === 'purchased' && (
        <div className="text-center text-sm text-green-600 font-semibold py-2">
          ✓ Owned
        </div>
      )}
    </div>
  );
};
