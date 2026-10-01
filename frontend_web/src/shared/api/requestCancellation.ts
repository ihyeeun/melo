export function createRequestAbortError() {
  const error = new Error("요청이 취소되었습니다.");
  error.name = "AbortError";
  return error;
}

export function isRequestAbortError(error: unknown): boolean {
  return isCancelledError(error) || (error instanceof Error && error.name === "AbortError");
}

export function throwIfRequestAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw createRequestAbortError();
}

// Shared follow-up queries can finish caching, but a cancelled screen stops waiting.
export function runWithAbortSignal<T>(signal: AbortSignal, task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(createRequestAbortError());
      return;
    }

    const onAbort = () => reject(createRequestAbortError());
    signal.addEventListener("abort", onAbort, { once: true });

    void (async () => {
      try {
        const result = await task();
        throwIfRequestAborted(signal);
        resolve(result);
      } catch (error) {
        reject(signal.aborted ? createRequestAbortError() : error);
      } finally {
        signal.removeEventListener("abort", onAbort);
      }
    })();
  });
}
import { isCancelledError } from "@tanstack/react-query";
