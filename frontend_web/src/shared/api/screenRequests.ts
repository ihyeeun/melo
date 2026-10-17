import { createRequestAbortError, runWithAbortSignal } from "@/shared/api/requestCancellation";

let activeScreenId: string | null = null;
let screenController = new AbortController();

export function setActiveRequestScreen(screenId: string | null) {
  if (activeScreenId === screenId) return;

  const previousController = screenController;
  activeScreenId = screenId;
  screenController = new AbortController();
  previousController.abort();
}

// Capture once before an async sequence so returning to the same screen cannot revive it.
export function captureScreenRequestScope(expectedScreenId?: string) {
  const signal = screenController.signal;
  const belongsToScreen = expectedScreenId === undefined || expectedScreenId === activeScreenId;
  const isActive = () => belongsToScreen && !signal.aborted;
  const assertActive = () => {
    if (!isActive()) throw createRequestAbortError();
  };

  return {
    screenId: activeScreenId,
    signal,
    isActive,
    assertActive,
    run<T>(task: () => Promise<T>): Promise<T> {
      if (!belongsToScreen) return Promise.reject(createRequestAbortError());
      return runWithAbortSignal(signal, task);
    },
  };
}

export type ScreenRequestScope = ReturnType<typeof captureScreenRequestScope>;
