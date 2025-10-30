import { useState } from 'react';
import type { SubmitSuggestionRequest } from '../../shared/types/missionSuggestions';
import { ToastContainer } from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { submitSuggestion } from '../utils/missionSuggestionApi';

interface SuggestMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SuggestMissionModal = ({
  isOpen,
  onClose,
  onSuccess,
}: SuggestMissionModalProps) => {
  const [formData, setFormData] = useState<SubmitSuggestionRequest>({
    title: '',
    target: 'LEO',
    risk: 'Low',
    reward: 'Science',
    description: '',
    payload_hint: 'Any',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toasts, showToast, hideToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.title.length < 4 || formData.title.length > 60) {
      showToast('Title must be between 4 and 60 characters', 'error');
      return;
    }

    if (formData.description.length > 280) {
      showToast('Description must be 280 characters or less', 'error');
      return;
    }

    if (formData.description.length === 0) {
      showToast('Description is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitSuggestion(formData);

      if (response.ok) {
        showToast('Mission suggestion submitted!', 'success');
        // Reset form
        setFormData({
          title: '',
          target: 'LEO',
          risk: 'Low',
          reward: 'Science',
          description: '',
          payload_hint: 'Any',
        });
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1000);
      } else {
        showToast(response.message || 'Failed to submit suggestion', 'error');
      }
    } catch (error) {
      showToast('Error submitting suggestion', 'error');
    } finally {
      setSubmitting(false);
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Suggest a Mission</h2>
            <p className="text-sm text-gray-600">
              Share your idea for a community mission
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1">
                  Mission Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Deploy Solar Observatory"
                  minLength={4}
                  maxLength={60}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/60 characters
                </p>
              </div>

              {/* Target */}
              <div>
                <label htmlFor="target" className="block text-sm font-semibold text-gray-700 mb-1">
                  Target <span className="text-red-500">*</span>
                </label>
                <select
                  id="target"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="LEO">LEO (Low Earth Orbit)</option>
                  <option value="Moon">Moon</option>
                  <option value="Mars">Mars</option>
                  <option value="Deep Space">Deep Space</option>
                  <option value="Asteroid Belt">Asteroid Belt</option>
                  <option value="Jupiter">Jupiter</option>
                  <option value="Saturn">Saturn</option>
                </select>
              </div>

              {/* Risk and Reward Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Risk */}
                <div>
                  <label htmlFor="risk" className="block text-sm font-semibold text-gray-700 mb-1">
                    Risk Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="risk"
                    value={formData.risk}
                    onChange={(e) => setFormData({ ...formData, risk: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                {/* Reward */}
                <div>
                  <label htmlFor="reward" className="block text-sm font-semibold text-gray-700 mb-1">
                    Reward Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="reward"
                    value={formData.reward}
                    onChange={(e) => setFormData({ ...formData, reward: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="Science">Science</option>
                    <option value="Unlock">Unlock</option>
                    <option value="Prestige">Prestige</option>
                  </select>
                </div>
              </div>

              {/* Payload Hint */}
              <div>
                <label htmlFor="payload_hint" className="block text-sm font-semibold text-gray-700 mb-1">
                  Payload Hint <span className="text-red-500">*</span>
                </label>
                <select
                  id="payload_hint"
                  value={formData.payload_hint}
                  onChange={(e) => setFormData({ ...formData, payload_hint: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="Any">Any</option>
                  <option value="Probe">Probe</option>
                  <option value="Hab">Hab</option>
                  <option value="Cargo">Cargo</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="Describe your mission idea..."
                  rows={4}
                  maxLength={280}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/280 characters
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </>
  );
};
