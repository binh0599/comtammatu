"use client";

import { useRef, useSyncExternalStore, useReducer, useEffect } from "react";

// ---------------------------------------------------------------------------
// Core online/offline detection using useSyncExternalStore for consistency
// ---------------------------------------------------------------------------

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

/**
 * Hook that returns the current online/offline status.
 * Uses `navigator.onLine` + online/offline events for instant updates.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook that provides online status + a "just came back online" flag
 * that stays true for a short duration after reconnection.
 * Useful for triggering sync operations.
 */
export function useOnlineStatusWithReconnect() {
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(false);
  const [justReconnected, setJustReconnected] = useReducer(
    (_: boolean, v: boolean) => v,
    false,
  );

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setJustReconnected(true);
      const timer = setTimeout(() => setJustReconnected(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return { isOnline, justReconnected };
}
