import type { WebTabStackAction } from "./appTabNavigation";

export const WEB_NAVIGATION_COMMAND_EVENT = "MELO_WEB_NAVIGATION_COMMAND";
export const DEFAULT_TAB_BACK_FALLBACK_PATH = "/home";

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

export function createWebNavigationCommandDispatchSource(commandExpression: string) {
  const serializedEventName = JSON.stringify(WEB_NAVIGATION_COMMAND_EVENT);

  return `
    (function (command) {
      var eventName = ${serializedEventName};
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail: command }));
      } catch {
        var event = document.createEvent("Event");
        event.initEvent(eventName, true, true);
        event.detail = command;
        window.dispatchEvent(event);
      }
    })(${commandExpression});
  `;
}

export function createWebNavigationCommandScript(command: WebNavigationCommand) {
  return `
    (function () {
      ${createWebNavigationCommandDispatchSource(JSON.stringify(command))}
    })();
    true;
  `;
}
