/**
 * Component for displaying active unlock effects
 * Shows a summary of all effects currently applied from unlocks
 */

import { useUnlocks } from '../hooks/useUnlocks';
import { calculateActiveEffects } from '../utils/unlockEffects';

interface ActiveEffectsDisplayProps {
  compact?: boolean;
}

export function ActiveEffectsDisplay({ compact = false }: ActiveEffectsDisplayProps) {
  const { tree, status } = useUnlocks();

  if (!tree || !status) {
    return null;
  }

  const effects = calculateActiveEffects(tree, status);

  // Check if there are any active effects
  const hasEffects =
    (effects.successChance !== undefined && effects.successChance !== 0) ||
    (effects.morale !== undefined && effects.morale !== 0) ||
    (effects.maxFuel !== undefined && effects.maxFuel !== 0) ||
    (effects.scienceBonus !== undefined && effects.scienceBonus !== 0);

  if (!hasEffects) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {effects.successChance !== undefined && effects.successChance !== 0 && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            {effects.successChance > 0 ? '+' : ''}
            {effects.successChance}% Success
          </span>
        )}
        {effects.morale !== undefined && effects.morale !== 0 && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              effects.morale > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {effects.morale > 0 ? '+' : ''}
            {effects.morale} Morale
          </span>
        )}
        {effects.maxFuel !== undefined && effects.maxFuel !== 0 && (
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
            {effects.maxFuel > 0 ? '+' : ''}
            {effects.maxFuel} Fuel
          </span>
        )}
        {effects.scienceBonus !== undefined && effects.scienceBonus !== 0 && (
          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
            {effects.scienceBonus > 0 ? '+' : ''}
            {effects.scienceBonus}% Science
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <h4 className="font-semibold text-gray-900">Active Effects</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {effects.successChance !== undefined && effects.successChance !== 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-700">
              Success Chance:{' '}
              <span className="font-semibold text-green-700">
                {effects.successChance > 0 ? '+' : ''}
                {effects.successChance}%
              </span>
            </span>
          </div>
        )}

        {effects.morale !== undefined && effects.morale !== 0 && (
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${effects.morale > 0 ? 'bg-blue-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-700">
              Morale:{' '}
              <span
                className={`font-semibold ${effects.morale > 0 ? 'text-blue-700' : 'text-red-700'}`}
              >
                {effects.morale > 0 ? '+' : ''}
                {effects.morale}
              </span>
            </span>
          </div>
        )}

        {effects.maxFuel !== undefined && effects.maxFuel !== 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-sm text-gray-700">
              Max Fuel:{' '}
              <span className="font-semibold text-yellow-700">
                {effects.maxFuel > 0 ? '+' : ''}
                {effects.maxFuel}
              </span>
            </span>
          </div>
        )}

        {effects.scienceBonus !== undefined && effects.scienceBonus !== 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span className="text-sm text-gray-700">
              Science Bonus:{' '}
              <span className="font-semibold text-purple-700">
                {effects.scienceBonus > 0 ? '+' : ''}
                {effects.scienceBonus}%
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
