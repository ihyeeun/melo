import { useEffect } from "react";

import {
  type MenuSelectionFlowId,
  useMenuSelectionFlowRemoveFlow,
} from "@/features/menu-selection-flow/stores/menuSelectionFlow.store";
import {
  getMenuSelectionFlowIdFromSearchParams,
  isMenuSelectionFlowNavigationPathname,
} from "@/features/menu-selection-flow/utils/menuSelectionFlowRoutes";

function isCurrentRouteUsingSameMenuSelectionFlow(menuSelectionFlowId: MenuSelectionFlowId) {
  if (typeof window === "undefined") {
    return false;
  }

  const currentUrl = new URL(window.location.href, window.location.origin);
  const currentMenuSelectionFlowId = getMenuSelectionFlowIdFromSearchParams(
    currentUrl.searchParams,
  );

  return (
    currentMenuSelectionFlowId === menuSelectionFlowId &&
    isMenuSelectionFlowNavigationPathname(currentUrl.pathname)
  );
}

export function useRemoveMenuSelectionFlowOnExit(
  menuSelectionFlowId?: MenuSelectionFlowId | null,
) {
  const removeFlow = useMenuSelectionFlowRemoveFlow();

  useEffect(() => {
    if (!menuSelectionFlowId) {
      return;
    }

    return () => {
      // A menu-selection flow can move across several screens with the same id.
      // Wait one tick so the next route is visible before deciding whether it ended.
      window.setTimeout(() => {
        if (isCurrentRouteUsingSameMenuSelectionFlow(menuSelectionFlowId)) {
          return;
        }

        removeFlow(menuSelectionFlowId);
      }, 0);
    };
  }, [menuSelectionFlowId, removeFlow]);
}
