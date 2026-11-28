const QUOTA_EXCEEDED_EVENT = 'cleanbreath:gmp-quota-exceeded';

/**
 * Emits a typed custom event when Google Maps Platform reports quota exhaustion or auth failure.
 */
export function emitMapsQuotaExceeded(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(QUOTA_EXCEEDED_EVENT));
}

/**
 * Subscribes to Google Maps Platform quota-exceeded events and returns an unsubscribe callback.
 */
export function subscribeMapsQuotaExceeded(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(QUOTA_EXCEEDED_EVENT, listener);
  return () => window.removeEventListener(QUOTA_EXCEEDED_EVENT, listener);
}

/**
 * Registers the official Google Maps JavaScript API global auth failure hook without monkey-patching console.
 */
export function registerGlobalMapsAuthFailure(): void {
  if (typeof window === 'undefined') return;
  (window as Window & { gm_authFailure?: () => void }).gm_authFailure = () => {
    emitMapsQuotaExceeded();
  };
}
