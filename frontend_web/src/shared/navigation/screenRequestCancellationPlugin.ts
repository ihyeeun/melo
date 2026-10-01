import type { StackflowPlugin } from "@stackflow/core";
import type { Query, QueryClient } from "@tanstack/react-query";

import { captureScreenRequestScope, setActiveRequestScreen } from "@/shared/api/screenRequests";

export function screenRequestCancellationPlugin(queryClient: QueryClient): StackflowPlugin {
  const interruptedQueries = new Map<string, Set<Query>>();
  const syncScreen: NonNullable<ReturnType<StackflowPlugin>["onInit"]> = ({ actions }) => {
    const { activities } = actions.getStack();
    const screenId = activities.find((activity) => activity.isActive)?.id ?? null;
    const previousScreenId = captureScreenRequestScope().screenId;
    if (previousScreenId === screenId) return;

    if (previousScreenId !== null) {
      interruptedQueries.set(
        previousScreenId,
        new Set(queryClient.getQueryCache().findAll({ fetchStatus: "fetching" })),
      );
    }

    // Restore cancelled queries so the next screen can fetch shared data normally.
    void queryClient.cancelQueries({ fetchStatus: "fetching" });
    setActiveRequestScreen(screenId);

    // Stackflow keeps covered screens mounted; their queries won't get a new mount event.
    const queriesToResume = screenId === null ? undefined : interruptedQueries.get(screenId);
    if (screenId !== null) {
      interruptedQueries.delete(screenId);
      void queryClient.refetchQueries({
        type: "active",
        predicate: (query) => queriesToResume?.has(query) === true || query.state.isInvalidated,
      });
    }

    const retainedIds = new Set(
      activities
        .filter((activity) => activity.transitionState !== "exit-done")
        .map((activity) => activity.id),
    );
    interruptedQueries.forEach((_queries, id) => {
      if (!retainedIds.has(id)) interruptedQueries.delete(id);
    });
  };

  return () => ({
    key: "screen-request-cancellation",
    onInit: syncScreen,
    onChanged: syncScreen,
  });
}
