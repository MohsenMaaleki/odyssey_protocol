/**
 * Component for displaying locked missions with unlock requirements
 * Shows a visual indicator and information for missions that require unlocks
 */

import { useState } from 'react';

interface LockedMissionIndicatorProps {
  missionName: string;
  missionDescription?: string;
  unlockRequirement: {
    id: string;
    label: string;
    cost: number;
  };
  onUnlockClick?: () => void;
}

export function LockedMissionIndicator({
  missionName,
  missionDescription,
  unlockRequirement,
  onUnlockClick,
}: LockedMissionIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Locked Mission Card */}
      <div className="p-4 rounded-lg border-2 border-gray-300 bg-gray-100 opacity-70 cursor-not-allowed">
        <div className="flex items-start gap-3">
          {/* Lock Icon */}
          <div className="flex-shrink-0 mt-1">
            <svg
              className="w-6 h-6 text-gray-500"
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
          </div>

          {/* Mission Info */}
          <div className="flex-1">
            <div className="font-semibold text-gray-700">{missionName}</div>
            {missionDescription && (
              <div className="text-sm text-gray-600 mt-1">{missionDescription}</div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded">
                🔒 Locked
              </span>
              <span className="text-xs text-gray-600">
                Requires: {unlockRequirement.label} ({unlockRequirement.cost} SP)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
          <div className="font-semibold mb-1">🔒 Mission Locked</div>
          <div className="mb-2">
            Unlock <span className="font-medium">{unlockRequirement.label}</span> to access this
            mission
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
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
        </div>
      )}
    </div>
  );
}
