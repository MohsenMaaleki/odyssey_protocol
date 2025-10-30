/**
 * RocketBuilder - Phase 2 enhanced design interface
 */

import { useState } from 'react';
import type { EngineKind, FuelTankSize, PayloadKind } from '../../shared/types/mission';

interface RocketBuilderProps {
  currentEngine: EngineKind;
  currentTank: FuelTankSize | null;
  currentPayload: PayloadKind;
  currentFuel: number;
  fuelMax: number;
  onSelectEngine: (engine: Exclude<EngineKind, null>) => Promise<void>;
  onSelectTank: (tank: FuelTankSize) => Promise<void>;
  onSelectPayload: (payload: Exclude<PayloadKind, null>) => Promise<void>;
  onAddFuel: (amount: number) => Promise<void>;
  disabled?: boolean;
}

export function RocketBuilder(props: RocketBuilderProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    if (loading || props.disabled) return;
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const engines = [
    { id: 'Light' as const, label: 'Light Engine', icon: '🔥', effects: 'Success +3%' },
    { id: 'Heavy' as const, label: 'Heavy Engine', icon: '⚡', effects: 'Success +7%, Morale -2%' },
    { id: 'Advanced' as const, label: 'Advanced Engine', icon: '🚀', effects: 'Success +12%', locked: true },
  ];

  const tanks = [
    { id: 'S' as const, label: 'Small', capacity: 60 },
    { id: 'M' as const, label: 'Medium', capacity: 80 },
    { id: 'L' as const, label: 'Large', capacity: 100 },
    { id: 'XL' as const, label: 'XL', capacity: 120, locked: true },
  ];

  const payloads = [
    { id: 'Probe' as const, label: 'Probe', icon: '🛰️', effects: 'Success +2%' },
    { id: 'Hab' as const, label: 'Habitat', icon: '🏠', effects: 'Morale +5%' },
    { id: 'Cargo' as const, label: 'Cargo', icon: '📦', effects: 'Fuel +5' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">🔧 Rocket Builder</h3>

      {/* Engines */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">Engine</div>
        <div className="grid grid-cols-3 gap-2">
          {engines.map((e) => (
            <button
              key={e.id}
              onClick={() => !e.locked && handleAction(() => props.onSelectEngine(e.id))}
              disabled={loading || props.disabled || e.locked}
              className={`p-3 rounded border-2 ${props.currentEngine === e.id ? 'border-blue-600 bg-blue-50' : 'border-gray-300'} ${e.locked ? 'opacity-50' : ''}`}
            >
              <div className="text-2xl">{e.icon}</div>
              <div className="text-xs font-semibold">{e.label}</div>
              <div className="text-xs text-gray-600">{e.effects}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tanks */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">Fuel Tank</div>
        <div className="grid grid-cols-4 gap-2">
          {tanks.map((t) => (
            <button
              key={t.id}
              onClick={() => !t.locked && handleAction(() => props.onSelectTank(t.id))}
              disabled={loading || props.disabled || t.locked}
              className={`p-2 rounded border-2 ${props.currentTank === t.id ? 'border-green-600 bg-green-50' : 'border-gray-300'} ${t.locked ? 'opacity-50' : ''}`}
            >
              <div className="text-xs font-semibold">{t.label}</div>
              <div className="text-xs text-gray-600">{t.capacity}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Payloads */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">Payload</div>
        <div className="grid grid-cols-3 gap-2">
          {payloads.map((p) => (
            <button
              key={p.id}
              onClick={() => handleAction(() => props.onSelectPayload(p.id))}
              disabled={loading || props.disabled}
              className={`p-3 rounded border-2 ${props.currentPayload === p.id ? 'border-purple-600 bg-purple-50' : 'border-gray-300'}`}
            >
              <div className="text-2xl">{p.icon}</div>
              <div className="text-xs font-semibold">{p.label}</div>
              <div className="text-xs text-gray-600">{p.effects}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Fuel */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">Fuel</span>
          <span>{props.currentFuel}/{props.fuelMax}</span>
        </div>
        <button
          onClick={() => handleAction(() => props.onAddFuel(10))}
          disabled={loading || props.disabled || props.currentFuel >= props.fuelMax}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          +10 Fuel
        </button>
      </div>
    </div>
  );
}
