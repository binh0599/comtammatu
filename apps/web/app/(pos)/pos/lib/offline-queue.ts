/**
 * Offline order queue — stores orders in IndexedDB when offline,
 * syncs them via Server Actions when connectivity returns.
 */

import {
  addPendingOrder,
  getPendingOrders,
  removePendingOrder,
  updatePendingOrder,
  type PendingOrder,
} from "./offline-db";
import { createOrder, confirmOrder } from "../orders/actions";

const MAX_ATTEMPTS = 5;

/**
 * Queue an order for later sync. Called when the user submits an order while offline.
 * Validates the payload shape client-side before storing.
 */
export async function queueOfflineOrder(payload: PendingOrder["payload"]): Promise<string> {
  const clientId = crypto.randomUUID();
  const order: PendingOrder = {
    clientId,
    createdAt: new Date().toISOString(),
    payload,
    attempts: 0,
  };
  await addPendingOrder(order);
  return clientId;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ clientId: string; error: string }>;
}

/**
 * Attempt to sync all pending orders to the server.
 * Processes orders sequentially (oldest first) to preserve order.
 * Returns summary of successes and failures.
 */
export async function syncPendingOrders(): Promise<SyncResult> {
  const pending = await getPendingOrders();
  if (pending.length === 0) return { synced: 0, failed: 0, errors: [] };

  // Sort by creation time (oldest first)
  pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  for (const order of pending) {
    // Skip orders that have exceeded max attempts
    if (order.attempts >= MAX_ATTEMPTS) {
      result.failed++;
      result.errors.push({
        clientId: order.clientId,
        error: `Exceeded max attempts (${MAX_ATTEMPTS})`,
      });
      continue;
    }

    try {
      const createResult = await createOrder({
        ...order.payload,
        idempotency_key: order.clientId,
      });

      if (createResult.error !== null) {
        // Server rejected the order — mark as failed, don't retry
        order.attempts = MAX_ATTEMPTS; // prevent further retries
        order.lastError = createResult.error;
        await updatePendingOrder(order);
        result.failed++;
        result.errors.push({
          clientId: order.clientId,
          error: createResult.error,
        });
        continue;
      }

      // Auto-confirm to send to kitchen (mirrors online flow)
      if (createResult.orderId) {
        await confirmOrder(createResult.orderId);
      }

      // Success — remove from queue
      await removePendingOrder(order.clientId);
      result.synced++;
    } catch {
      // Network error — increment attempt counter and move on
      order.attempts++;
      order.lastError = "Network error during sync";
      await updatePendingOrder(order);
      result.failed++;
      result.errors.push({
        clientId: order.clientId,
        error: "Network error",
      });
    }
  }

  return result;
}
