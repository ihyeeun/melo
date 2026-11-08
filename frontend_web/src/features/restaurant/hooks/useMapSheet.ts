import { type RefObject, useLayoutEffect, useState } from "react";

import type { SheetSnapPoint } from "@/features/restaurant/components/map/MapBottomSheet";
import {
  SHEET_ACTION_POLICY,
  SHEET_VIEW_SNAP,
} from "@/features/restaurant/constants/mapSheet.policy";
import { useStackflowBackHandler } from "@/shared/navigation/stackflowNavigation";

export type SheetRestaurant = { restaurantId: number; restaurantName: string };

export type MapSheetAction =
  | { type: "click_restaurant"; restaurant: SheetRestaurant }
  | { type: "back" | "submit_search" | "search_map_area" };

// scrollTop: 다른 화면으로 넘어갈 때의 스크롤 위치. 돌아오면 되살린다.
// prevSnapPoint: 이 화면에 들어오기 전 시트 높이. 뒤로 가면 되돌린다.
export type MapSheetView = { scrollTop?: number; prevSnapPoint?: SheetSnapPoint } & (
  | { type: "list" }
  | { type: "detail"; restaurant: SheetRestaurant }
);

type MapSheet = { views: MapSheetView[]; snapPoint: SheetSnapPoint };

function createListSheet(): MapSheet {
  return { views: [{ type: "list" }], snapPoint: SHEET_VIEW_SNAP.list };
}

function applySheetAction(sheet: MapSheet, action: MapSheetAction): MapSheet {
  const policy = SHEET_ACTION_POLICY[action.type];

  switch (policy.method) {
    case "push": {
      // 액션에 담긴 값(restaurant)을 그대로 화면 값으로 쓴다. 둘의 짝은 MapSheetAction이 맞춘다.
      const view = { ...action, type: policy.target, prevSnapPoint: sheet.snapPoint } as MapSheetView;
      return {
        views: [...sheet.views, view],
        snapPoint: SHEET_VIEW_SNAP[policy.target] ?? sheet.snapPoint,
      };
    }
    case "pop": {
      if (sheet.views.length === 1) return sheet;

      const leavingView = sheet.views[sheet.views.length - 1];
      return {
        views: sheet.views.slice(0, -1),
        snapPoint: leavingView.prevSnapPoint ?? sheet.snapPoint,
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
