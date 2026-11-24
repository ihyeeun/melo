import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

// 사진 기록 이벤트의 공통 틀: 시작 → 인식 결과(성공 · 실패). 음식 사진과 영양성분표가 같은 모양이다
export type ScanKind = "food" | "label";
// diet = 식단 기록 쪽, chat = AI 코치 채팅 안(기록 탭 [카메라]로 찍은 것 포함)
export type ScanSource = "diet" | "chat";

const SCAN_EVENT = {
  food: {
    start: EVENT_NAME.FOOD_SCAN_START,
    success: EVENT_NAME.FOOD_SCAN_SUCCESS,
    fail: EVENT_NAME.FOOD_SCAN_FAIL,
  },
  label: {
    start: EVENT_NAME.LABEL_SCAN_START,
    success: EVENT_NAME.LABEL_SCAN_SUCCESS,
    fail: EVENT_NAME.LABEL_SCAN_FAIL,
  },
} as const;

// 사진을 촬영하거나 고른 직후(형식 · 용량 검사 전). 실패율의 분모
export function trackScanStart(
  kind: ScanKind,
  { source, imageFrom }: { source: ScanSource; imageFrom: "camera" | "gallery" },
) {
  track(SCAN_EVENT[kind].start, { source, image_from: imageFrom });
}

export function trackScanSuccess(kind: ScanKind, source: ScanSource) {
  track(SCAN_EVENT[kind].success, { source });
}

// reason은 사진 실패 원인 구분(getPhotoFailureReason)과 같은 값
export function trackScanFail(
  kind: ScanKind,
  { source, reason }: { source: ScanSource; reason: string },
) {
  track(SCAN_EVENT[kind].fail, { source, reason });
}
