import { navigateTo } from '@devvit/web/client';
import { useState, useMemo } from 'react';
import { useCounter } from './hooks/useCounter';
import { useToast } from './hooks/useToast';
import { GalleryButton } from './components/GalleryButton';
import { SavePatchButton } from './components/SavePatchButton';
import { GalleryModal } from './components/GalleryModal';
import { LeaderboardButton } from './components/LeaderboardButton';
import { LeaderboardModal } from './components/LeaderboardModal';
import { TechTreeButton } from './components/TechTreeButton';
import { TechTreeModal } from './components/TechTreeModal';
import { ToastContainer } from './components/ToastContainer';
import { SuggestMissionButton } from './components/SuggestMissionButton';
import { BallotButton } from './components/BallotButton';
import { SuggestMissionModal } from './components/SuggestMissionModal';
import { SuggestionsModal } from './components/SuggestionsModal';
import { BallotModal } from './components/BallotModal';
import { createMockMissionData } from './utils/missionData';
// import { collectMissionData } from './utils/missionData'; // Uncomment when game is implemented
import type { SavePatchRequest } from '../shared/types/gallery';
import { MissionDemo } from './components/MissionDemo';
import { AppHeader } from './components/AppHeader';

export const App = () => {
  const { count, username, loading, increment, decrement } = useCounter();
  const { toasts, showToast, hideToast } = useToast();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isTechTreeOpen, setIsTechTreeOpen] = useState(false);
  const [isSuggestMissionOpen, setIsSuggestMissionOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isBallotOpen, setIsBallotOpen] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  // Mock mission data for demonstration (will be replaced with actual game state)
  // When the game is implemented, replace this with:
  // const missionData = useMemo(() => collectMissionData(gameState), [gameState]);
  const mockMissionData: SavePatchRequest = useMemo(() => createMockMissionData(1), []);

  const handleSavePatch = (success: boolean, message: string) => {
    showToast(message, success ? 'success' : 'error');
  };

  const handleOpenGallery = async () => {
    // Fetch moderator status when opening gallery
    try {
      const res = await fetch('/api/gallery/is-moderator');
      if (res.ok) {
        const data = await res.json();
        setIsModerator(data.isModerator);
      }
    } catch (error) {
      console.error('Failed to check moderator status:', error);
      setIsModerator(false);
    }
    setIsGalleryOpen(true);
  };

  const handleCloseGallery = () => {
    setIsGalleryOpen(false);
  };

  const handleOpenLeaderboard = async () => {
    // Fetch moderator status when opening leaderboard
    try {
      const res = await fetch('/api/gallery/is-moderator');
      if (res.ok) {
        const data = await res.json();
        setIsModerator(data.isModerator);
      }
    } catch (error) {
      console.error('Failed to check moderator status:', error);
      setIsModerator(false);
    }
    setIsLeaderboardOpen(true);
  };

  const handleCloseLeaderboard = () => {
    setIsLeaderboardOpen(false);
  };

  const handleOpenTechTree = () => {
    setIsTechTreeOpen(true);
  };

  const handleCloseTechTree = () => {
    setIsTechTreeOpen(false);
  };

  const handleOpenSuggestMission = () => {
    setIsSuggestMissionOpen(true);
  };

  const handleCloseSuggestMission = () => {
    setIsSuggestMissionOpen(false);
  };

  const handleOpenSuggestions = async () => {
    // Fetch moderator status when opening suggestions
    try {
      const res = await fetch('/api/gallery/is-moderator');
      if (res.ok) {
        const data = await res.json();
        console.log('[App] Moderator status:', data.isModerator);
        setIsModerator(data.isModerator);
      } else {
        console.error('[App] Failed to fetch moderator status:', res.status);
        setIsModerator(false);
      }
    } catch (error) {
      console.error('[App] Failed to check moderator status:', error);
      setIsModerator(false);
    }
    setIsSuggestionsOpen(true);
  };

  const handleCloseSuggestions = () => {
    setIsSuggestionsOpen(false);
  };

  const handleOpenBallot = async () => {
    // Fetch moderator status when opening ballot
    try {
      const res = await fetch('/api/gallery/is-moderator');
      if (res.ok) {
        const data = await res.json();
        setIsModerator(data.isModerator);
      }
    } catch (error) {
      console.error('Failed to check moderator status:', error);
      setIsModerator(false);
    }
    setIsBallotOpen(true);
  };

  const handleCloseBallot = () => {
    setIsBallotOpen(false);
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/odyssey_bg.png')" }}
    >
      <div className="backdrop-brightness-[0.35] backdrop-blur-sm min-h-screen">
        {/* App Header with Branding */}
        <AppHeader />

        <div className="flex relative flex-col items-center gap-6 px-4 pb-8">
          {/* Mission HUD Demo */}
          <MissionDemo />

          {/* Toast Notifications */}
          <ToastContainer toasts={toasts} onClose={hideToast} />

          <img className="object-contain w-1/2 max-w-[250px] mx-auto" src="/snoo.png" alt="Snoo" />
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold text-center text-white">
              {username ? `Hey ${username} 👋` : ''}
            </h1>
            <p className="text-base text-center text-slate-200">
              Edit <span className="bg-slate-800/60 px-1 py-0.5 rounded">src/client/App.tsx</span> to get
              started.
            </p>
          </div>
          <div className="flex items-center justify-center mt-5">
            <button
              className="flex items-center justify-center bg-[#d93900] text-white w-14 h-14 text-[2.5em] rounded-full cursor-pointer font-mono leading-none transition-colors"
              onClick={decrement}
              disabled={loading}
            >
              -
            </button>
            <span className="text-[1.8em] font-medium mx-5 min-w-[50px] text-center leading-none text-white">
              {loading ? '...' : count}
            </span>
            <button
              className="flex items-center justify-center bg-[#d93900] text-white w-14 h-14 text-[2.5em] rounded-full cursor-pointer font-mono leading-none transition-colors"
              onClick={increment}
              disabled={loading}
            >
              +
            </button>
          </div>

          {/* Gallery, Leaderboard, and Tech Tree Integration Section */}
          <div className="flex flex-col items-center gap-4 mt-6 w-full max-w-2xl px-4">
            <div className="flex gap-3 flex-wrap justify-center w-full">
              <GalleryButton onClick={handleOpenGallery} />
              <LeaderboardButton onClick={handleOpenLeaderboard} />
              <TechTreeButton onClick={handleOpenTechTree} />
            </div>
            <div className="flex gap-3 flex-wrap justify-center w-full">
              <SuggestMissionButton onClick={handleOpenSuggestMission} />
              <button
                onClick={handleOpenSuggestions}
                className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <span>📋</span>
                View Suggestions
              </button>
              <BallotButton onClick={handleOpenBallot} />
            </div>
            {/* 
          SavePatchButton shown for demo - will be conditional on RESULT phase in actual game
          When game is implemented, replace with:
          {gameState.phase === 'RESULT' && (
            <SavePatchButton 
              missionData={collectMissionData(gameState)} 
              onSave={handleSavePatch} 
            />
          )}
        */}
            <div className="w-full flex justify-center">
              <SavePatchButton missionData={mockMissionData} onSave={handleSavePatch} />
            </div>
          </div>

          <footer className="mt-12 mb-8 flex gap-3 text-[0.8em] text-slate-300">
            <button
              className="cursor-pointer hover:text-white transition-colors"
              onClick={() => navigateTo('https://developers.reddit.com/docs')}
            >
              Docs
            </button>
            <span className="text-slate-500">|</span>
            <button
              className="cursor-pointer hover:text-white transition-colors"
              onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
            >
              r/Devvit
            </button>
            <span className="text-slate-500">|</span>
            <button
              className="cursor-pointer hover:text-white transition-colors"
              onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}
            >
              Discord
            </button>
          </footer>

          {/* Gallery Modal */}
          <GalleryModal isOpen={isGalleryOpen} onClose={handleCloseGallery} isModerator={isModerator} />

          {/* Leaderboard Modal */}
          <LeaderboardModal
            isOpen={isLeaderboardOpen}
            onClose={handleCloseLeaderboard}
            currentUsername={username || ''}
            isModerator={isModerator}
          />

          {/* Tech Tree Modal */}
          <TechTreeModal isOpen={isTechTreeOpen} onClose={handleCloseTechTree} />

          {/* Suggest Mission Modal */}
          <SuggestMissionModal
            isOpen={isSuggestMissionOpen}
            onClose={handleCloseSuggestMission}
            onSuccess={handleOpenSuggestions}
          />

          {/* Suggestions Modal */}
          <SuggestionsModal
            isOpen={isSuggestionsOpen}
            onClose={handleCloseSuggestions}
            currentUsername={username || ''}
            isModerator={isModerator}
          />

          {/* Ballot Modal */}
          <BallotModal
            isOpen={isBallotOpen}
            onClose={handleCloseBallot}
            currentUsername={username || ''}
            isModerator={isModerator}
          />
        </div>
      </div>
    </div>
  );
};
