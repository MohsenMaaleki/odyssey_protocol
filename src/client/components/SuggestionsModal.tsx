import { useState, useEffect } from 'react';
import type { Suggestion, VoteValue } from '../../shared/types/missionSuggestions';
import { SuggestionCard } from './SuggestionCard';
import { ToastContainer } from './ToastContainer';
import { useToast } from '../hooks/useToast';
import {
  listSuggestions,
  voteSuggestion,
  approveSuggestion,
  rejectSuggestion,
  createBallot,
  resetSuggestionsData,
} from '../utils/missionSuggestionApi';

interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  isModerator: boolean;
}

type TabType = 'top' | 'new' | 'mine' | 'approved';

export const SuggestionsModal = ({
  isOpen,
  onClose,
  currentUsername,
  isModerator,
}: SuggestionsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('top');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showBallotDialog, setShowBallotDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const { toasts, showToast, hideToast } = useToast();

  // Fetch suggestions based on active tab and page
  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const sort = activeTab === 'top' ? 'top' : 'new';
      // Show only pending suggestions on Top/New tabs, approved on Approved tab, and all on Mine tab
      const status = activeTab === 'approved' ? 'approved' : activeTab === 'mine' ? 'all' : 'pending';
      const filterUsername = activeTab === 'mine' ? currentUsername : undefined;

      const params: any = {
        status,
        page,
        perPage: 10,
        sort,
      };

      if (filterUsername) {
        params.filterUsername = filterUsername;
      }

      const response = await listSuggestions(params);

      if (response.ok && response.data) {
        setSuggestions(response.data.suggestions);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        showToast(response.message || 'Failed to load suggestions', 'error');
        setSuggestions([]);
      }
    } catch (error) {
      showToast('Error loading suggestions', 'error');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch suggestions when tab changes or page changes
  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen, activeTab, page]);

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

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

  const handleApprove = async (suggestionId: string) => {
    try {
      console.log('[SuggestionsModal] Approving suggestion:', suggestionId);
      const response = await approveSuggestion(suggestionId);
      console.log('[SuggestionsModal] Approve response:', response);

      if (response.ok && response.suggestion) {
        showToast('Suggestion approved!', 'success');
        // Refetch the list to show updated state
        await fetchSuggestions();
      } else {
        console.error('[SuggestionsModal] Approve failed:', response.message);
        showToast(response.message || 'Failed to approve suggestion', 'error');
      }
    } catch (error) {
      console.error('[SuggestionsModal] Approve error:', error);
      showToast('Error approving suggestion', 'error');
    }
  };

  const handleReject = async (suggestionId: string) => {
    try {
      console.log('[SuggestionsModal] Rejecting suggestion:', suggestionId);
      const response = await rejectSuggestion(suggestionId);
      console.log('[SuggestionsModal] Reject response:', response);

      if (response.ok) {
        showToast('Suggestion rejected!', 'error');
        // Refetch the list to show updated state
        await fetchSuggestions();
      } else {
        console.error('[SuggestionsModal] Reject failed:', response.message);
        showToast(response.message || 'Failed to reject suggestion', 'error');
      }
    } catch (error) {
      console.error('[SuggestionsModal] Reject error:', error);
      showToast('Error rejecting suggestion', 'error');
    }
  };

  const handleToggleSelection = (suggestionId: string) => {
    setSelectedSuggestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  };

  const handleCreateBallot = () => {
    if (selectedSuggestions.size < 2 || selectedSuggestions.size > 4) {
      showToast('Please select 2-4 suggestions for the ballot', 'error');
      return;
    }
    setShowBallotDialog(true);
  };

  const handleConfirmBallot = async (closesInMinutes: number) => {
    try {
      const response = await createBallot(Array.from(selectedSuggestions), closesInMinutes);

      if (response.ok) {
        showToast('Ballot created successfully!', 'success');
        setSelectedSuggestions(new Set());
        setShowBallotDialog(false);
      } else {
        showToast(response.message || 'Failed to create ballot', 'error');
      }
    } catch (error) {
      showToast('Error creating ballot', 'error');
    }
  };

  const handleResetData = async () => {
    try {
      const response = await resetSuggestionsData();

      if (response.ok) {
        showToast('Data reset successfully!', 'success');
        setShowResetDialog(false);
        await fetchSuggestions();
      } else {
        showToast(response.message || 'Failed to reset data', 'error');
      }
    } catch (error) {
      showToast('Error resetting data', 'error');
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

          {/* Reset button (moderator only, for debugging) */}
          {isModerator && (
            <button
              onClick={() => setShowResetDialog(true)}
              className="absolute top-4 right-14 z-10 text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-1 rounded hover:bg-red-50"
              title="Reset all suggestions data (debug)"
            >
              🗑️ Reset
            </button>
          )}

          {/* Header */}
          <div className="p-6 pb-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mission Suggestions</h2>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('top')}
                className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'top'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                🔥 Top
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'new'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                ⚡ New
              </button>
              <button
                onClick={() => setActiveTab('mine')}
                className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'mine'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                👤 Mine
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'approved'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                ✓ Approved
              </button>
            </div>

            {/* Ballot Creation Button (Moderator Only, Approved Tab) */}
            {isModerator && activeTab === 'approved' && suggestions.length > 0 && (
              <div className="mt-4 flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-700">
                  {selectedSuggestions.size === 0
                    ? 'Select 2-4 suggestions to create a ballot'
                    : `${selectedSuggestions.size} suggestion(s) selected`}
                </div>
                <button
                  onClick={handleCreateBallot}
                  disabled={selectedSuggestions.size < 2 || selectedSuggestions.size > 4}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${selectedSuggestions.size >= 2 && selectedSuggestions.size <= 4
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  🗳️ Create Ballot
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading suggestions...</div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <div className="text-lg font-medium">No suggestions found</div>
                <div className="text-sm">
                  {activeTab === 'mine'
                    ? 'You haven\'t submitted any suggestions yet'
                    : 'Be the first to suggest a mission!'}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {suggestions.map((suggestion) => {
                  const cardProps: any = {
                    key: suggestion.id,
                    suggestion,
                    onVote: handleVote,
                    showModControls: isModerator,
                    currentUserVote: suggestion.voters[currentUsername] || 0,
                  };

                  if (isModerator) {
                    cardProps.onApprove = handleApprove;
                    cardProps.onReject = handleReject;
                  }

                  const isSelected = selectedSuggestions.has(suggestion.id);
                  const showCheckbox = isModerator && activeTab === 'approved';

                  return (
                    <div key={suggestion.id} className="relative">
                      {showCheckbox && (
                        <div className="absolute top-4 left-4 z-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelection(suggestion.id)}
                            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                          />
                        </div>
                      )}
                      <div className={showCheckbox ? 'ml-8' : ''}>
                        <SuggestionCard {...cardProps} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {!loading && suggestions.length > 0 && totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={handlePreviousPage}
                disabled={page === 1}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                ← Previous
              </button>
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </div>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${page === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Reset All Data</h3>

            <p className="text-gray-700 mb-6">
              This will permanently delete ALL mission suggestions, votes, and ballots. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ballot Creation Dialog */}
      {showBallotDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Ballot</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                You have selected {selectedSuggestions.size} suggestion(s) for the ballot.
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Selected suggestions:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {Array.from(selectedSuggestions).map((id) => {
                    const suggestion = suggestions.find((s) => s.id === id);
                    return suggestion ? (
                      <li key={id} className="truncate">
                        • {suggestion.title}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 mb-2">
                Voting Duration (minutes)
              </label>
              <input
                type="number"
                id="duration"
                defaultValue={240}
                min={30}
                max={10080}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    handleConfirmBallot(parseInt(input.value));
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: 240 minutes (4 hours). Min: 30, Max: 10080 (1 week)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBallotDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('duration') as HTMLInputElement;
                  handleConfirmBallot(parseInt(input.value));
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Ballot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </>
  );
};
