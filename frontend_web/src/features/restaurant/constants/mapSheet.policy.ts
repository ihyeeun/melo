import { DEFAULT_SNAP_POINT } from "@/features/restaurant/components/map/MapBottomSheet";

export type MapSheetViewType = "list" | "detail";

// snap: 들어갈 때 시트 높이를 이 값으로 맞춘다. 없으면 SHEET_VIEW_SNAP을 따른다.
type SheetTransition =
  | { method: "push" | "replace"; target: MapSheetViewType; snap?: number }
  | { method: "pop" | "reset" };

type SheetActionPolicy = Record<
  string,
  SheetTransition | Record<MapSheetViewType, SheetTransition>
>;

// 액션이 시트 화면을 어떻게 바꾸는지. 화면마다 동작이 다르면 화면별로 나눠 적는다.
// push: 화면을 쌓는다 / replace: 지금 화면을 바꾼다 / pop: 이전 화면으로 돌아간다 / reset: 목록만 남긴다
export const SHEET_ACTION_POLICY = {
  click_restaurant: { method: "push", target: "detail" },
  // 상세에서 다른 마커를 누르면 바꿔치기해서, 뒤로가기가 목록으로 가게 한다.
  click_marker: {
    list: { method: "push", target: "detail", snap: DEFAULT_SNAP_POINT },
    detail: { method: "replace", target: "detail", snap: DEFAULT_SNAP_POINT },
  },
  back: { method: "pop" },
  submit_search: { method: "reset" },
  search_map_area: { method: "reset" },
} as const satisfies SheetActionPolicy;

// 화면을 새로 열거나 뒤로 돌아올 때의 시트 높이. null이면 지금 높이를 유지한다.
export const SHEET_VIEW_SNAP = {
  list: DEFAULT_SNAP_POINT,
  detail: null,
} as const satisfies Record<MapSheetViewType, number | null>;
