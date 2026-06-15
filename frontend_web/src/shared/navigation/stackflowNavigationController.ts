type StackflowNavigateBackOptions = {
  animate?: boolean;
  count?: number;
  fallbackOptions?: {
    animate?: boolean;
    replace?: boolean;
    state?: unknown;
  };
  fallbackTo?:
    | string
    | {
        hash?: string;
        pathname?: string;
        search?: string;
      };
  skipBackHandler?: boolean;
};

type StackflowNavigateBackHandler = (options?: StackflowNavigateBackOptions) => boolean;

let navigateBackHandler: StackflowNavigateBackHandler | null = null;

export function setStackflowNavigateBackHandler(handler: StackflowNavigateBackHandler) {
  navigateBackHandler = handler;
}

export function navigateBack(options?: StackflowNavigateBackOptions) {
  if (navigateBackHandler) {
    return navigateBackHandler(options);
  }

  if (typeof window !== "undefined") {
    window.history.back();
    return true;
  }

  return false;
}
