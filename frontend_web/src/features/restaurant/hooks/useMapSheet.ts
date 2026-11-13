import { type RefObject, useLayoutEffect, useState } from "react";

import type { NearbyRestaurant } from "@/features/restaurant/api/nearbyRestaurant.api";
import type { SheetSnapPoint } from "@/features/restaurant/components/map/MapBottomSheet";
import {
  SHEET_ACTION_POLICY,
  SHEET_VIEW_SNAP,
} from "@/features/restaurant/constants/mapSheet.policy";
import { useStackflowBackHandler } from "@/shared/navigation/stackflowNavigation";

// restaurantId: 멜로 식당이 아니면 null이고, 상세 대신 "메뉴 준비 중"을 보여준다.
export type SheetRestaurant = NearbyRestaurant & { restaurantId: number | null };

export type MapSheetAction =
  | { type: "click_restaurant" | "click_marker"; restaurant: SheetRestaurant }
  | { type: "back" | "submit_search" | "search_map_area" };

// scrollTop: 다른 화면으로 넘어갈 때의 스크롤 위치. 돌아오면 되살린다.
export type MapSheetView = { scrollTop?: number } & (
  | { type: "list" }
  | { type: "detail"; restaurant: SheetRestaurant }
);

type MapSheet = { views: MapSheetView[]; snapPoint: SheetSnapPoint };

// 시트가 이 높이일 때 화면 아래쪽을 가리는 높이(px). 비율은 화면 높이 기준이다.
export function getSheetHeight(snapPoint: SheetSnapPoint) {
  if (typeof snapPoint === "number") return window.innerHeight * snapPoint;
  return snapPoint ? parseFloat(snapPoint) : 0;
}

function createListSheet(): MapSheet {
  return { views: [{ type: "list" }], snapPoint: SHEET_VIEW_SNAP.list };
}

function applySheetAction(sheet: MapSheet, action: MapSheetAction): MapSheet {
  const currentView = sheet.views[sheet.views.length - 1];
  const entry = SHEET_ACTION_POLICY[action.type];
  // 화면마다 동작이 다른 액션은 지금 화면의 정책을 쓴다.
  const policy = "method" in entry ? entry : entry[currentView.type];

  switch (policy.method) {
    case "push":
    case "replace": {
      // 액션에 담긴 값(restaurant)을 그대로 화면 값으로 쓴다. 둘의 짝은 MapSheetAction이 맞춘다.
      const view = { ...action, type: policy.target } as MapSheetView;
      const baseViews = policy.method === "replace" ? sheet.views.slice(0, -1) : sheet.views;

      return {
        views: [...baseViews, view],
        snapPoint:
          ("snap" in policy ? policy.snap : undefined) ??
          SHEET_VIEW_SNAP[policy.target] ??
          sheet.snapPoint,
      };
    }
    case "pop": {
      if (sheet.views.length === 1) return sheet;

      const backView = sheet.views[sheet.views.length - 2];
      return {
        views: sheet.views.slice(0, -1),
        snapPoint: SHEET_VIEW_SNAP[backView.type] ?? sheet.snapPoint,
      };
    }
    case "reset":
      return createListSheet();
  }
}

// 지도 시트의 화면 스택과 높이를 관리한다. 어떤 액션에 어떻게 바뀌는지는 mapSheet.policy에 둔다.
export function useMapSheet(sheetBodyRef: RefObject<HTMLDivElement | null>) {
  const [sheet, setSheet] = useState(createListSheet);
  const currentView = sheet.views[sheet.views.length - 1];

  const moveSheet = (action: MapSheetAction) => {
    const scrollTop = sheetBodyRef.current?.scrollTop ?? 0;

    setSheet((prev) => {
      const leavingView = { ...prev.views[prev.views.length - 1], scrollTop };
      return applySheetAction({ ...prev, views: [...prev.views.slice(0, -1), leavingView] }, action);
    });
  };

  const setSnapPoint = (snapPoint: SheetSnapPoint) => {
    setSheet((prev) => ({ ...prev, snapPoint }));
  };

  // 화면이 바뀌면 그 화면의 스크롤 위치로 맞춘다. 새로 연 화면은 맨 위부터 보여준다.
  useLayoutEffect(() => {
    if (sheetBodyRef.current) sheetBodyRef.current.scrollTop = currentView.scrollTop ?? 0;
  }, [sheetBodyRef, currentView]);

  // 안드로이드 뒤로가기도 같은 액션으로 처리한다. 목록만 남으면 원래 뒤로가기로 넘어간다.
  useStackflowBackHandler(
    sheet.views.length > 1
      ? () => {
          moveSheet({ type: "back" });
          return true;
        }
      : null,
  );

  return { currentView, snapPoint: sheet.snapPoint, setSnapPoint, moveSheet };
}
