type VitePreloadErrorEvent = Event & {
  payload?: unknown;
};

const changeListeners = new Set<() => void>();

let hasPreloadError = false;
let isListenerInitialized = false;

function emitChange() {
  changeListeners.forEach((listener) => {
    listener();
  });
}

function handleVitePreloadError(event: Event) {
  const preloadEvent = event as VitePreloadErrorEvent;

  console.error("[vite:preloadError] Failed to preload an application chunk", preloadEvent.payload);

  if (hasPreloadError) return;

  hasPreloadError = true;
  emitChange();

  // Do not call preventDefault(). A failed lazy import must still reject so the
  // error boundary can replace a partial or unstyled screen with its safe UI.
}

export function initVitePreloadErrorListener() {
  if (isListenerInitialized || typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", handleVitePreloadError);
  isListenerInitialized = true;
}

export function getHasVitePreloadError() {
  return hasPreloadError;
}

export function subscribeVitePreloadError(listener: () => void) {
  changeListeners.add(listener);

  return () => {
    changeListeners.delete(listener);
  };
}
