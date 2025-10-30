import { useState } from 'react';
import type { SavePatchRequest } from '../../shared/types/gallery';

interface SavePatchButtonProps {
  missionData: SavePatchRequest;
  onSave: (success: boolean, message: string) => void;
  disabled?: boolean;
}

export const SavePatchButton = ({ missionData, onSave, disabled }: SavePatchButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/gallery/save-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionData),
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        onSave(false, data.message || 'Failed to save mission patch');
      } else {
        onSave(true, data.message || 'Mission patch saved successfully!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save mission patch';
      onSave(false, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Saving...' : 'Save Mission Patch'}
    </button>
  );
};
