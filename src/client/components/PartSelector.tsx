/**
 * Part selector component with unlock filtering
 * Displays available and locked parts for ship design
 */

import { useUnlocks } from '../hooks/useUnlocks';
import { isPartAvailable, getPartUnlockRequirement } from '../utils/unlockFilters';
import { LockedPartIndicator } from './LockedPartIndicator';

interface PartSelectorProps {
  partType: 'engine' | 'tank';
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  onOpenTechTree?: () => void;
}

export function PartSelector({
  partType,
  selectedPartId,
  onSelectPart,
  onOpenTechTree,
}: PartSelectorProps) {
  const { tree, status } = useUnlocks();

  if (!tree || !status) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-pulse">Loading parts...</div>
      </div>
    );
  }

  // Get all parts of the specified type
  const allParts = tree.nodes.filter((node) => {
    if (node.type !== 'part') return false;
    if (partType === 'engine') return node.id.startsWith('engine_');
    if (partType === 'tank') return node.id.startsWith('tank_');
    return false;
  });

  // Separate into available and locked parts
  const availableParts = allParts.filter((part) => isPartAvailable(part.id, tree, status));
  const lockedParts = allParts.filter((part) => !isPartAvailable(part.id, tree, status));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {partType === 'engine' ? 'Engines' : 'Fuel Tanks'}
      </h3>

      {/* Available Parts */}
      {availableParts.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Available</div>
          <div className="grid grid-cols-1 gap-2">
            {availableParts.map((part) => {
              const isSelected = selectedPartId === part.id;
              return (
                <button
                  key={part.id}
                  onClick={() => onSelectPart(part.id)}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                    }
                  `}
                >
                  <div className="font-medium text-gray-900">{part.label}</div>
                  {part.description && (
                    <div className="text-sm text-gray-600 mt-1">{part.description}</div>
                  )}
                  {part.effect && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {part.effect.successChance && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          +{part.effect.successChance}% Success
                        </span>
                      )}
                      {part.effect.morale && (
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            part.effect.morale > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {part.effect.morale > 0 ? '+' : ''}
                          {part.effect.morale} Morale
                        </span>
                      )}
                      {part.effect.maxFuel && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          +{part.effect.maxFuel} Fuel
                        </span>
                      )}
                      {part.effect.scienceBonus && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          +{part.effect.scienceBonus}% Science
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Parts */}
      {lockedParts.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Locked</div>
          <div className="grid grid-cols-1 gap-2">
            {lockedParts.map((part) => {
              const unlockReq = getPartUnlockRequirement(part.id, tree, status);
              if (!unlockReq) return null;

              return (
                <div key={part.id} className="p-3 rounded-lg border-2 border-gray-200 bg-gray-50">
                  <LockedPartIndicator
                    partName={part.label}
                    unlockRequirement={unlockReq}
                    {...(onOpenTechTree && { onUnlockClick: onOpenTechTree })}
                  />
                  {part.description && (
                    <div className="text-sm text-gray-500 mt-2 ml-6">{part.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No parts available */}
      {availableParts.length === 0 && lockedParts.length === 0 && (
        <div className="p-4 text-center text-gray-500">No parts available</div>
      )}
    </div>
  );
}
