// Each WebView owns a registry so cancelling one screen cannot affect another WebView.
export function createBridgeRequestRegistry() {
  const controllers = new Map<string, AbortController>();

  return {
    start(id: string) {
      controllers.get(id)?.abort();
      const controller = new AbortController();
      controllers.set(id, controller);
      return controller;
    },
    cancel(id: string) {
      controllers.get(id)?.abort();
      controllers.delete(id);
    },
    finish(id: string, controller: AbortController) {
      if (controllers.get(id) === controller) controllers.delete(id);
    },
    cancelAll() {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    },
  };
}

export type BridgeRequestRegistry = ReturnType<typeof createBridgeRequestRegistry>;
