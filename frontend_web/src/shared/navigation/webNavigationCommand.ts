export const WEB_NAVIGATION_COMMAND_EVENT = "MELO_WEB_NAVIGATION_COMMAND";

type WebTabStackAction = "push" | "reset";

export type WebNavigationCommand =
  | {
      type: "SYNC_TAB_PATH";
      href: string;
      path: string;
      stackAction: WebTabStackAction;
      animate: boolean;
    }
  | {
      type: "BACK";
      fallbackPath: string;
      animate: boolean;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWebTabStackAction(value: unknown): value is WebTabStackAction {
  return value === "push" || value === "reset";
}

export function getWebNavigationCommand(event: Event): WebNavigationCommand | null {
  const detail = (event as CustomEvent<unknown>).detail;
  if (!isRecord(detail)) return null;

  if (detail.type === "SYNC_TAB_PATH") {
    if (typeof detail.href !== "string") return null;
    if (typeof detail.path !== "string") return null;
    if (!isWebTabStackAction(detail.stackAction)) return null;
    if (typeof detail.animate !== "boolean") return null;

    return {
      type: "SYNC_TAB_PATH",
      href: detail.href,
      path: detail.path,
      stackAction: detail.stackAction,
      animate: detail.animate,
    };
  }

  if (detail.type === "BACK") {
    if (typeof detail.fallbackPath !== "string") return null;
    if (typeof detail.animate !== "boolean") return null;

    return {
      type: "BACK",
      fallbackPath: detail.fallbackPath,
      animate: detail.animate,
    };
  }

  return null;
}
