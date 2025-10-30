/**
 * VotingPanel - Displays active vote with options, tallies, and countdown
 * Phase 2: Community voting for mission decisions
 */

import { useState, useEffect } from 'react';
import type {
  VoteWindow,
  VoteTallies,
  VoteOptionId,
} from '../../shared/types/mission';

interface VotingPanelProps {
  window: VoteWindow | null;
  tallies: VoteTallies | null;
  serverNow: string;
  onCastVote: (optionId: VoteOptionId) => Promise<void>;
  userVote?: VoteOptionId | null;
}

export function VotingPanel({
  window,
  tallies,
  serverNow,
  onCastVote,
  userVote,
}: VotingPanelProps) {
  const [casting, setCasting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Calculate time remaining
  useEffect(() => {
    if (!window || window.status !== 'open') {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const endsAt = new Date(window.ends_at).getTime();
      const remaining = Math.max(0, endsAt - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [window]);

  if (!window || window.status !== 'open') {
    return null;
  }

  const handleVote = async (optionId: VoteOptionId) => {
    if (casting) return;
    setCasting(true);
    try {
      await onCastVote(optionId);
    } finally {
      setCasting(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getOptionLabel = (optionId: VoteOptionId): string => {
    const labels: Record<string, string> = {
      finalize_design: '✅ Finalize Design',
      add_more_fuel: '⛽ Add More Fuel',
      manual_launch: '🚀 Launch Now',
      hold_course: '➡️ Hold Course',
      course_correction: '🎯 Course Correction',
      run_experiment: '🔬 Run Experiment',
    };
    return labels[optionId] || optionId;
  };

  const getOptionDescription = (optionId: VoteOptionId): string => {
    const descriptions: Record<string, string> = {
      finalize_design: 'Lock in current design and proceed to launch',
      add_more_fuel: 'Continue adding fuel and adjusting design',
      manual_launch: 'Launch the mission immediately',
      hold_course: 'Maintain current trajectory (no stat changes)',
      course_correction: 'Adjust course (Fuel -8, Success +6)',
      run_experiment: 'Conduct science experiment (Fuel -4, Science +3)',
    };
    return descriptions[optionId] || '';
  };

  const totalVotes = tallies?.total ?? 0;
  const isVoteClosed = window.status !== 'open' || timeRemaining === 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">
            Community Vote: {window.phase}
          </h3>
        </div>

        {/* Countdown */}
        {!isVoteClosed && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border-2 border-blue-400">
            <svg
              className="w-4 h-4 text-blue-600 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-mono font-bold text-blue-900">
              T-{formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Vote Options */}
      <div className="space-y-3">
        {window.options.map((optionId) => {
          const votes = tallies?.perOption[optionId] ?? 0;
          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          const isUserVote = userVote === optionId;
          const isWinner = tallies?.winner === optionId;

          return (
            <button
              key={optionId}
              onClick={() => handleVote(optionId)}
              disabled={casting || isVoteClosed}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all relative overflow-hidden
                ${
                  isUserVote
                    ? 'border-blue-600 bg-blue-100 shadow-md'
                    : 'border-gray-300 bg-white hover:border-blue-400 hover:shadow'
                }
                ${isVoteClosed && isWinner ? 'ring-4 ring-green-400' : ''}
                ${casting || isVoteClosed ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
              `}
            >
              {/* Vote percentage background */}
              <div
                className={`absolute inset-0 transition-all duration-300 ${
                  isUserVote ? 'bg-blue-200' : 'bg-gray-100'
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {getOptionLabel(optionId)}
                      {isUserVote && (
                        <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">
                          Your Vote
                        </span>
                      )}
                      {isVoteClosed && isWinner && (
                        <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded-full">
                          Winner
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {getOptionDescription(optionId)}
                    </div>
                  </div>

                  {/* Vote count */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-gray-900">{votes}</div>
                    <div className="text-xs text-gray-600">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Total Votes: <span className="font-semibold text-gray-900">{totalVotes}</span>
          </div>
          {isVoteClosed ? (
            <div className="text-green-600 font-semibold">Vote Closed</div>
          ) : (
            <div className="text-blue-600">
              {userVote ? 'You can change your vote' : 'Cast your vote now!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
