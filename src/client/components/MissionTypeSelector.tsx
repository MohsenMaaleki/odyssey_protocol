/**
 * MissionTypeSelector - Phase 2 mission type selection
 * Displays LunarOrbit, MarsFlyby, AsteroidSurvey with unlock gating
 */

import type { MissionType } from '../../shared/types/mission';

interface MissionTypeOption {
  id: MissionType;
  label: string;
  description: string;
  icon: string;
  difficulty: string;
  rewards: string;
  locked?: boolean;
  unlockRequirement?: string;
}

interface MissionTypeSelectorProps {
  selected: MissionType | null;
  onSelect: (type: MissionType) => void;
  disabled?: boolean;
}

export function MissionTypeSelector({ selected, onSelect, disabled }: MissionTypeSelectorProps) {
  const missions: MissionTypeOption[] = [
    {
      id: 'LunarOrbit',
      label: 'Lunar Orbit',
      description: 'Standard orbital mission around the Moon',
      icon: '🌙',
      difficulty: 'Easy',
      rewards: '10-15 SP',
      locked: false,
    },
    {
      id: 'MarsFlyby',
      label: 'Mars Flyby',
      description: 'High-speed flyby of the Red Planet',
      icon: '🔴',
      difficulty: 'Medium',
      rewards: '20-30 SP',
      locked: true,
      unlockRequirement: 'Requires: Advanced Navigation',
    },
    {
      id: 'AsteroidSurvey',
      label: 'Asteroid Survey',
      description: 'Survey and sample collection from asteroid belt',
      icon: '☄️',
      difficulty: 'Hard',
      rewards: '30-50 SP',
      locked: true,
      unlockRequirement: 'Requires: Deep Space Ops',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Select Mission Type</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {missions.map((mission) => {
          const isSelected = selected === mission.id;
          const isLocked = mission.locked;

          return (
            <button
              key={mission.id}
              onClick={() => !isLocked && !disabled && onSelect(mission.id)}
              disabled={disabled || isLocked}
              className={`
                p-4 rounded-lg border-2 text-left transition-all relative
                ${isSelected ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-300 bg-white'}
                ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-400 hover:shadow cursor-pointer'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* Lock Icon */}
              {isLocked && (
                <div className="absolute top-3 right-3">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="text-4xl flex-shrink-0">{mission.icon}</div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900">{mission.label}</h4>
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{mission.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      mission.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                      mission.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {mission.difficulty}
                    </span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                      {mission.rewards}
                    </span>
                  </div>

                  {/* Unlock Requirement */}
                  {isLocked && mission.unlockRequirement && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      🔒 {mission.unlockRequirement}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
