/**
 * Tech Tree Modal Component
 * Displays unlock tree in grid layout organized by type
 */

import { useUnlocks } from '../hooks/useUnlocks';
import { UnlockNode } from './UnlockNode';
import { ToastContainer } from './ToastContainer';
import { useToast } from '../hooks/useToast';
import type { UnlockNode as UnlockNodeType } from '../../shared/types/unlock';

interface TechTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechTreeModal = ({ isOpen, onClose }: TechTreeModalProps) => {
  const { tree, status, loading, error, purchaseUnlock, refresh } = useUnlocks();
  const { toasts, showToast, hideToast } = useToast();

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePurchase = async (id: string) => {
    console.log('[TechTreeModal] Purchasing unlock:', id);
    const result = await purchaseUnlock(id);
    console.log('[TechTreeModal] Purchase result:', result);
    
    if (!result.ok) {
      showToast(result.message || 'Failed to purchase unlock', 'error');
    } else {
      showToast('Unlock purchased successfully!', 'success');
    }
  };

  const getNodeStatus = (node: UnlockNodeType): 'locked' | 'available' | 'purchased' => {
    if (!status) return 'locked';

    // Check if already purchased
    if (status.unlocks.includes(node.id)) {
      return 'purchased';
    }

    // Check if prerequisites are met
    const prereqsMet = node.prereq.every((prereq) => status.unlocks.includes(prereq));
    if (!prereqsMet) {
      return 'locked';
    }

    // Check if user has enough SP
    if (status.total_science_points < node.cost) {
      return 'locked';
    }

    return 'available';
  };

  const organizeNodesByType = () => {
    if (!tree) return { parts: [], missions: [], bonuses: [] };

    return {
      parts: tree.nodes.filter((n) => n.type === 'part'),
      missions: tree.nodes.filter((n) => n.type === 'mission'),
      bonuses: tree.nodes.filter((n) => n.type === 'bonus'),
    };
  };

  if (!isOpen) return null;

  const { parts, missions, bonuses } = organizeNodesByType();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          aria-label="Close"
        >
          ×
        </button>

        {/* Header with SP Balance */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-3">
            <span className="text-3xl">🔬</span>
            Tech Tree
          </h2>
          <div className="flex items-center gap-2 text-lg">
            <span className="text-2xl">⚗️</span>
            <span className="font-semibold text-blue-600">
              {status?.total_science_points ?? 0} Science Points
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
              <button
                onClick={refresh}
                className="ml-4 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading tech tree...</div>
            </div>
          )}

          {!loading && tree && status && (
            <div className="space-y-8">
              {/* Ship Parts Section */}
              {parts.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    Ship Parts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {parts.map((node) => (
                      <UnlockNode
                        key={node.id}
                        node={node}
                        status={getNodeStatus(node)}
                        onPurchase={handlePurchase}
                        purchasedUnlocks={status.unlocks}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Missions Section */}
              {missions.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🌍</span>
                    Missions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {missions.map((node) => (
                      <UnlockNode
                        key={node.id}
                        node={node}
                        status={getNodeStatus(node)}
                        onPurchase={handlePurchase}
                        purchasedUnlocks={status.unlocks}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bonuses Section */}
              {bonuses.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    Bonuses
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bonuses.map((node) => (
                      <UnlockNode
                        key={node.id}
                        node={node}
                        status={getNodeStatus(node)}
                        onPurchase={handlePurchase}
                        purchasedUnlocks={status.unlocks}
                      />
                    ))}
                  </div>
                </div>
              )}

              {parts.length === 0 && missions.length === 0 && bonuses.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No unlocks available yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </div>
  );
};
