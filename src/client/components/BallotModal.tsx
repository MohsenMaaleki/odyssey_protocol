import { useState, useEffect } from 'react';
import type { Ballot, Suggestion, VoteValue } from '../../shared/types/missionSuggestions';
import { SuggestionCard } from './SuggestionCard';
import { ToastContainer } from './ToastContainer';
import { useToast } from '../hooks/useToast';
import {
  getCurrentBallot,
  voteSuggestion,
  closeBallot,
} from '../utils/missionSuggestionApi';

interface BallotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  isModerator: boolean;
}

export const BallotModal = ({
  isOpen,
  onClose,
  currentUsername,
  isModerator,
}: BallotModalProps) => {
  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const { toasts, showToast, hideToast } = useToast();

  // Fetch current ballot
  const fetchBallot = async () => {
    setLoading(true);
    try {
      const response = await getCurrentBallot();

      if (response.ok) {
        setBallot(response.ballot);
        setSuggestions(response.suggestions);
      } else {
        showToast('Failed to load ballot', 'error');
        setBallot(null);
        setSuggestions([]);
      }
    } catch (error) {
      showToast('Error loading ballot', 'error');
      setBallot(null);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch ballot when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBallot();
    }
  }, [isOpen]);

  // Calculate and update countdown timer
  useEffect(() => {
    if (!ballot || ballot.status !== 'open') {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const closesAt = new Date(ballot.closes_at).getTime();
      const diff = closesAt - now;

      if (diff <= 0) {
        setTimeRemaining('Voting closed');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [ballot]);

  const handleVote = async (suggestionId: string, value: VoteValue) => {
    try {
      const response = await voteSuggestion(suggestionId, value);

      if (response.ok) {
        // Update local state with new vote counts
        setSuggestions((prev) =>
          prev.map((s) => {
            if (s.id === suggestionId) {
              return {
                ...s,
                votes: {
                  up: response.up,
                  down: response.down,
                },
                voters: {
                  ...s.voters,
                  [currentUsername]: value,
                },
              };
            }
            return s;
          })
        );
        showToast('Vote recorded!', 'success');
      } else {
        showToast(response.message || 'Failed to vote', 'error');
      }
    } catch (error) {
      showToast('Error voting on suggestion', 'error');
    }
  };

  const handleCloseBallot = async () => {
    if (!ballot) return;

    try {
      const response = await closeBallot(ballot.id);

      if (response.ok) {
        // Update ballot status to closed
        setBallot((prev) => (prev ? { ...prev, status: 'closed', winner_id: response.winner_id || null } : null));
        showToast('Ballot closed successfully!', 'success');
        // Refresh ballot to get updated data
        fetchBallot();
      } else {
        showToast(response.message || 'Failed to close ballot', 'error');
      }
    } catch (error) {
      showToast('Error closing ballot', 'error');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        onClick={handleBackdropClick}
      >
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>

          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Community Ballot</h2>
              {ballot && ballot.status === 'open' && timeRemaining && (
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">Time remaining:</span>
                  <span className="text-lg font-bold text-blue-900 font-mono">
                    {timeRemaining}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Vote for your favorite mission suggestion
              </p>
              {isModerator && ballot && ballot.status === 'open' && (
                <button
                  onClick={handleCloseBallot}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  🔒 Close Ballot
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading ballot...</div>
              </div>
            ) : !ballot ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-4xl mb-2">🗳️</div>
                <div className="text-lg font-medium">No active ballot</div>
                <div className="text-sm">Check back later for community voting!</div>
              </div>
            ) : (
              <>
                {ballot.status === 'closed' && ballot.winner_id && (
                  <div className="mb-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🏆</span>
                      <span className="text-lg font-bold text-green-900">
                        Voting Closed - Winner Selected!
                      </span>
                    </div>
                    <p className="text-sm text-green-700">
                      The community has chosen their favorite mission
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {suggestions.map((suggestion) => {
                    const isWinner = ballot.status === 'closed' && suggestion.id === ballot.winner_id;
                    
                    return (
                      <div
                        key={suggestion.id}
                        className={isWinner ? 'ring-4 ring-green-400 rounded-lg' : ''}
                      >
                        {isWinner && (
                          <div className="bg-green-500 text-white px-4 py-2 rounded-t-lg font-bold flex items-center gap-2">
                            <span>🏆</span>
                            <span>WINNER</span>
                          </div>
                        )}
                        <SuggestionCard
                          suggestion={suggestion}
                          onVote={ballot.status === 'open' ? handleVote : () => {}}
                          showModControls={false}
                          currentUserVote={suggestion.voters[currentUsername] || 0}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </>
  );
};
