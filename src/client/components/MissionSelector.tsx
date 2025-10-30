/**
 * Mission selector component with unlock filtering
 * Displays available and locked missions for selection
 */

import { useUnlocks } from '../hooks/useUnlocks';
import { isMissionAvailable, getMissionUnlockRequirement } from '../utils/unlockFilters';
import { LockedMissionIndicator } from './LockedMissionIndicator';

interface MissionSelectorProps {
  selectedMissionId: string | null;
  onSelectMission: (missionId: string) => void;
  onOpenTechTree?: () => void;
}

export function MissionSelector({
  selectedMissionId,
  onSelectMission,
  onOpenTechTree,
}: MissionSelectorProps) {
  const { tree, status } = useUnlocks();

  if (!tree || !status) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-pulse">Loading missions...</div>
      </div>
    );
  }

  // Get all mission nodes
  const allMissions = tree.nodes.filter((node) => node.type === 'mission');

  // Separate into available and locked missions
  const availableMissions = allMissions.filter((mission) =>
    isMissionAvailable(mission.id, tree, status)
  );
  const lockedMissions = allMissions.filter(
    (mission) => !isMissionAvailable(mission.id, tree, status)
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Select Mission</h3>

      {/* Available Missions */}
      {availableMissions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Available Missions</div>
          <div className="grid grid-cols-1 gap-3">
            {availableMissions.map((mission) => {
              const isSelected = selectedMissionId === mission.id;
              return (
                <button
                  key={mission.id}
                  onClick={() => onSelectMission(mission.id)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Mission Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <svg
                        className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>

                    {/* Mission Info */}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{mission.label}</div>
                      {mission.description && (
                        <div className="text-sm text-gray-600 mt-1">{mission.description}</div>
                      )}
                      {mission.cost > 0 && (
                        <div className="mt-2">
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                            Unlock Cost: {mission.cost} SP
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Missions */}
      {lockedMissions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Locked Missions</div>
          <div className="grid grid-cols-1 gap-3">
            {lockedMissions.map((mission) => {
              const unlockReq = getMissionUnlockRequirement(mission.id, tree, status);
              if (!unlockReq) return null;

              return (
                <LockedMissionIndicator
                  key={mission.id}
                  missionName={mission.label}
                  {...(mission.description && { missionDescription: mission.description })}
                  unlockRequirement={unlockReq}
                  {...(onOpenTechTree && { onUnlockClick: onOpenTechTree })}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* No missions available */}
      {availableMissions.length === 0 && lockedMissions.length === 0 && (
        <div className="p-4 text-center text-gray-500">No missions available</div>
      )}
    </div>
  );
}
