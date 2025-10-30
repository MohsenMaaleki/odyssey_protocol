/**
 * Unlock API client utilities
 * Handles communication with unlock system endpoints
 */

import type {
  GetTreeResponse,
  UnlockStatus,
  PurchaseResult,
  PurchaseUnlockRequest,
} from '../../shared/types/unlock';

/**
 * Fetch the complete unlock tree and user's status
 */
export async function fetchUnlockTree(): Promise<GetTreeResponse> {
  const response = await fetch('/api/unlocks/tree');

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch unlock tree' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch user's unlock status only
 */
export async function fetchUnlockStatus(): Promise<UnlockStatus> {
  const response = await fetch('/api/unlocks/status');

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch unlock status' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Purchase an unlock by ID
 */
export async function purchaseUnlock(id: string): Promise<PurchaseResult> {
  const body: PurchaseUnlockRequest = { id };

  const response = await fetch('/api/unlocks/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  // Return the result regardless of HTTP status
  // The PurchaseResult.ok field indicates success/failure
  return result;
}
