import { useState, useEffect } from 'react';
import type {
  LeaderboardEntry,
  PersonalRank,
  GetTopResponse,
} from '../../shared/types/leaderboard';
import { LeaderboardRow } from './LeaderboardRow';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  isModerator: boolean;
}

interface SeasonInfo {
  season: number;
  season_started_at: string;
  season_ends_at: string | null;
}

export const LeaderboardModal = ({
  isOpen,
  onClose,
  currentUsername,
  isModerator,
}: LeaderboardModalProps) => {
  const [activeTab, setActiveTab] = useState<'top' | 'me'>('top');
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([]);
  const [personalRank, setPersonalRank] = useState<PersonalRank | null>(null);
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Moderator controls state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banUsername, setBanUsername] = useState('');
  const [banAction, setBanAction] = useState<'ban' | 'unban'>('ban');
  const [modActionLoading, setModActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch top entries when tab opens
  useEffect(() => {
    if (isOpen && activeTab === 'top') {
      fetchTopEntries();
    }
  }, [isOpen, activeTab]);

  // Fetch personal rank when Me tab opens
  useEffect(() => {
    if (isOpen && activeTab === 'me') {
      fetchPersonalRank();
    }
  }, [isOpen, activeTab]);

  const fetchTopEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leaderboard/top?n=10');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data: GetTopResponse = await response.json();
      setTopEntries(data.entries);
      setSeasonInfo({
        season: data.season,
        season_started_at: data.season_started_at,
        season_ends_at: data.season_ends_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalRank = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leaderboard/me');
      if (!response.ok) {
        throw new Error('Failed to fetch personal rank');
      }
      const data: PersonalRank = await response.json();
      setPersonalRank(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personal rank');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistanceToTop10 = (): string | null => {
    if (!personalRank || personalRank.rank === null || personalRank.rank <= 10) {
      return null;
    }

    // Find the 10th place points from topEntries if available
    if (topEntries.length >= 10 && topEntries[9]) {
      const tenthPlacePoints = topEntries[9].points;
      const pointsNeeded = tenthPlacePoints - personalRank.points + 1;
      if (pointsNeeded > 0) {
        return `${pointsNeeded} points to break Top 10`;
      }
    }

    return null;
  };

  const handleResetSeason = async () => {
    setModActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/leaderboard/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to reset season' }));
        throw new Error(errorData.message || 'Failed to reset season');
      }

      const data = await response.json();
      setSuccessMessage(`Season reset successful! Now on Season ${data.season}`);
      setShowResetConfirm(false);

      // Refresh leaderboard data
      if (activeTab === 'top') {
        await fetchTopEntries();
      } else {
        await fetchPersonalRank();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset season');
    } finally {
      setModActionLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!banUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    setModActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/leaderboard/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: banUsername.trim(),
          ban: banAction === 'ban',
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to update ban status' }));
        throw new Error(errorData.message || 'Failed to update ban status');
      }

      const data = await response.json();
      setSuccessMessage(
        data.banned
          ? `${data.username} has been banned from the leaderboard`
          : `${data.username} has been unbanned`
      );
      setShowBanDialog(false);
      setBanUsername('');

      // Refresh leaderboard data
      if (activeTab === 'top') {
        await fetchTopEntries();
      } else {
        await fetchPersonalRank();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ban status');
    } finally {
      setModActionLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">🏆</span>
            Leaderboard
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('top')}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'top'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Top Players
          </button>
          <button
            onClick={() => setActiveTab('me')}
            className={`flex-1 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'me'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Rank
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

          {successMessage && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">{successMessage}</div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading...</div>
            </div>
          )}

          {/* Top Tab */}
          {!loading && activeTab === 'top' && (
            <div className="space-y-3">
              {topEntries.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No entries yet. Be the first to earn points!
                </div>
              ) : (
                <>
                  {topEntries.map((entry) => (
                    <LeaderboardRow
                      key={entry.username}
                      rank={entry.rank}
                      username={entry.username}
                      points={entry.points}
                      isCurrentUser={entry.username === currentUsername}
                    />
                  ))}
                  {seasonInfo && (
                    <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
                      <p>
                        <strong>Season {seasonInfo.season}</strong>
                      </p>
                      <p className="mt-1">
                        Started: {new Date(seasonInfo.season_started_at).toLocaleDateString()}
                      </p>
                      {seasonInfo.season_ends_at && (
                        <p className="mt-1">
                          Ends: {new Date(seasonInfo.season_ends_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Me Tab */}
          {!loading && activeTab === 'me' && (
            <div className="space-y-4">
              {personalRank?.banned ? (
                <div className="text-center py-8">
                  <div className="text-red-600 text-lg font-semibold mb-2">
                    ⛔ You are banned from the leaderboard
                  </div>
                  <p className="text-gray-600">
                    Contact a moderator if you believe this is an error.
                  </p>
                </div>
              ) : personalRank && personalRank.rank !== null ? (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center">
                    <div className="text-gray-600 text-sm font-medium mb-2">Your Rank</div>
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                      #{personalRank.rank}
                    </div>
                    <div className="text-2xl font-semibold text-blue-600">
                      {personalRank.points} points
                    </div>
                  </div>

                  {calculateDistanceToTop10() && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <div className="text-yellow-800 font-medium">
                        🎯 {calculateDistanceToTop10()}
                      </div>
                    </div>
                  )}

                  {personalRank.rank <= 10 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-green-800 font-medium">
                        🌟 You're in the Top 10! Keep it up!
                      </div>
                    </div>
                  )}

                  {personalRank.rank === 1 && (
                    <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 text-center">
                      <div className="text-yellow-900 font-bold text-lg">
                        👑 You're #1! Congratulations!
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-600 text-lg mb-2">
                    You haven't earned any points yet
                  </div>
                  <p className="text-gray-500">
                    Participate in missions to start climbing the leaderboard!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Moderator Controls */}
        {isModerator && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Moderator Controls</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                disabled={modActionLoading}
              >
                Reset Season
              </button>
              <button
                onClick={() => {
                  setShowBanDialog(true);
                  setBanAction('ban');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                disabled={modActionLoading}
              >
                Ban User
              </button>
              <button
                onClick={() => {
                  setShowBanDialog(true);
                  setBanAction('unban');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                disabled={modActionLoading}
              >
                Unban User
              </button>
            </div>
          </div>
        )}

        {/* Reset Season Confirmation Dialog */}
        {showResetConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 rounded-lg">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Reset Season?</h3>
              <p className="text-gray-600 mb-4">
                This will clear all points and start a new season. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={modActionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetSeason}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  disabled={modActionLoading}
                >
                  {modActionLoading ? 'Resetting...' : 'Reset Season'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ban/Unban User Dialog */}
        {showBanDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 rounded-lg">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {banAction === 'ban' ? 'Ban User' : 'Unban User'}
              </h3>
              <p className="text-gray-600 mb-4">
                {banAction === 'ban'
                  ? 'Enter the username to ban from the leaderboard. They will not be able to earn points or appear in rankings.'
                  : 'Enter the username to unban. They will be able to earn points and appear in rankings again.'}
              </p>
              <input
                type="text"
                value={banUsername}
                onChange={(e) => setBanUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={modActionLoading}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowBanDialog(false);
                    setBanUsername('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={modActionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBanUser}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    banAction === 'ban'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={modActionLoading}
                >
                  {modActionLoading
                    ? 'Processing...'
                    : banAction === 'ban'
                      ? 'Ban User'
                      : 'Unban User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
