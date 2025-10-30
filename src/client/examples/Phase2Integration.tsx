/**
 * Phase2Integration - Example of how to integrate Phase 2 components
 * This shows how to use VotingPanel, RocketBuilder, and MissionTypeSelector
 */

import { useState } from 'react';
import { VotingPanel } from '../components/VotingPanel';
import { RocketBuilder } from '../components/RocketBuilder';
import { MissionTypeSelector } from '../components/MissionTypeSelector';
import { useVoting } from '../hooks/useVoting';
import type { MissionType, EngineKind, FuelTankSize, PayloadKind } from '../../shared/types/mission';

export function Phase2IntegrationExample() {
  // Voting state
  const voting = useVoting();
  
  // Mission state
  const [missionType, setMissionType] = useState<MissionType | null>(null);
  const [engine, setEngine] = useState<EngineKind>(null);
  const [tank, setTank] = useState<FuelTankSize | null>(null);
  const [payload, setPayload] = useState<PayloadKind>(null);
  const [fuel, setFuel] = useState(40);
  const [fuelMax, setFuelMax] = useState(100);

  // Example: Handle mission type selection
  const handleSelectMissionType = async (type: MissionType) => {
    setMissionType(type);
    // Call API to set mission type
    // await fetch('/api/mission/select-mission', { method: 'POST', body: JSON.stringify({ mission_type: type }) });
  };

  // Example: Handle engine selection
  const handleSelectEngine = async (selectedEngine: Exclude<EngineKind, null>) => {
    setEngine(selectedEngine);
    // Call API to apply engine
    await fetch('/api/mission/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickEngine: selectedEngine }),
    });
  };

  // Example: Handle tank selection
  const handleSelectTank = async (selectedTank: FuelTankSize) => {
    setTank(selectedTank);
    const capacities = { S: 60, M: 80, L: 100, XL: 120 };
    setFuelMax(capacities[selectedTank]);
    // Call API to apply tank
    await fetch('/api/mission/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectTank: selectedTank }),
    });
  };

  // Example: Handle payload selection
  const handleSelectPayload = async (selectedPayload: Exclude<PayloadKind, null>) => {
    setPayload(selectedPayload);
    // Call API to apply payload
    await fetch('/api/mission/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setPayload: selectedPayload }),
    });
  };

  // Example: Handle add fuel
  const handleAddFuel = async (amount: number) => {
    setFuel(prev => Math.min(prev + amount, fuelMax));
    // Call API to add fuel
    await fetch('/api/mission/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addFuel: amount }),
    });
  };

  // Example: Handle vote cast
  const handleCastVote = async (optionId: string) => {
    await voting.castVote(optionId);
  };

  // Example: Open a vote for design phase
  const handleOpenDesignVote = async () => {
    await voting.openVote('DESIGN', ['finalize_design', 'add_more_fuel'], 120);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Phase 2 Integration Example</h1>

      {/* Mission Type Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <MissionTypeSelector
          selected={missionType}
          onSelect={handleSelectMissionType}
        />
      </div>

      {/* Rocket Builder */}
      <div className="bg-white rounded-lg shadow p-6">
        <RocketBuilder
          currentEngine={engine}
          currentTank={tank}
          currentPayload={payload}
          currentFuel={fuel}
          fuelMax={fuelMax}
          onSelectEngine={handleSelectEngine}
          onSelectTank={handleSelectTank}
          onSelectPayload={handleSelectPayload}
          onAddFuel={handleAddFuel}
        />
      </div>

      {/* Voting Panel */}
      {voting.window && (
        <div className="bg-white rounded-lg shadow p-6">
          <VotingPanel
            window={voting.window}
            tallies={voting.tallies}
            serverNow={voting.serverNow}
            onCastVote={handleCastVote}
            userVote={null} // Get from voting.window.ballots[currentUsername]
          />
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Test Controls</h3>
        <div className="flex gap-3">
          <button
            onClick={handleOpenDesignVote}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open Design Vote
          </button>
          <button
            onClick={() => voting.refresh()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh Vote State
          </button>
        </div>
      </div>

      {/* Error Display */}
      {voting.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-semibold">Error:</div>
          <div className="text-red-600">{voting.error}</div>
        </div>
      )}
    </div>
  );
}
