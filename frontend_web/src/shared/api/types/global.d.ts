import type { AppApiError } from "@/shared/api/appApi";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AppApiError;
  }
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}
