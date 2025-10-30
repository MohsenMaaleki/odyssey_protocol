/**
 * Component for displaying locked parts with unlock requirements
 * Shows a visual indicator and tooltip for parts that require unlocks
 */

import { useState } from 'react';

interface LockedPartIndicatorProps {
  partName: string;
  unlockRequirement: {
    id: string;
    label: string;
    cost: number;
  };
  onUnlockClick?: () => void;
}

export function LockedPartIndicator({
  partName,
  unlockRequirement,
  onUnlockClick,
}: LockedPartIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Lock Icon */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded-lg opacity-60 cursor-not-allowed">
        <svg
          className="w-4 h-4 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="text-sm text-gray-600">{partName}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
          <div className="font-semibold mb-1">🔒 Locked</div>
          <div className="mb-2">
            Requires unlock: <span className="font-medium">{unlockRequirement.label}</span>
          </div>
          <div className="text-xs text-gray-300 mb-2">Cost: {unlockRequirement.cost} SP</div>
          {onUnlockClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlockClick();
              }}
              className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
            >
              Open Tech Tree
            </button>
          )}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
