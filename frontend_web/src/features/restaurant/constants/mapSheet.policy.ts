import { DEFAULT_SNAP_POINT } from "@/features/restaurant/components/map/MapBottomSheet";

export type MapSheetViewType = "list" | "detail";

type SheetActionPolicy = Record<
  string,
  { method: "push"; target: MapSheetViewType } | { method: "pop" | "reset" }
>;

// 액션이 시트 화면을 어떻게 바꾸는지
// push: 화면을 쌓는다 / pop: 이전 화면으로 돌아간다 / reset: 목록만 남긴다
export const SHEET_ACTION_POLICY = {
  click_restaurant: { method: "push", target: "detail" },
  back: { method: "pop" },
  submit_search: { method: "reset" },
  search_map_area: { method: "reset" },
} as const satisfies SheetActionPolicy;

// 화면에 들어갈 때의 시트 높이. null이면 지금 높이를 유지한다.
export const SHEET_VIEW_SNAP = {
  list: DEFAULT_SNAP_POINT,
  detail: null,
} as const satisfies Record<MapSheetViewType, number | null>;
