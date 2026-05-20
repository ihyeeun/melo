export const EVENT_NAME = {
  APP_OPEN: "app_open",
  SCREEN_VIEW: "screen_view",

  OCR_SCAN_START: "ocr_scan_start",
  OCR_SCAN_SUCCESS: "ocr_scan_success",
  OCR_SCAN_FAIL: "ocr_scan_fail",

  OCR_RESULT_VIEW: "ocr_result_view",
  OCR_RESULT_CONFIRM: "ocr_result_confirm",
  OCR_SCAN_CANCEL: "ocr_scan_cancel",

  FOOD_SCAN_START: "food_scan_start",
  FOOD_SCAN_SUCCESS: "food_scan_success",
  FOOD_SCAN_FAIL: "food_scan_fail",

  FOOD_RESULT_VIEW: "food_result_view",
  FOOD_RESULT_CONFIRM: "food_result_confirm",
  FOOD_SCAN_CANCEL: "food_scan_cancel",

  AI_COACH_CHAT: "ai_coach_chat",
  AI_COACH_RESPONSE_SUCCESS: "ai_coach_response_success",
  AI_COACH_RESPONSE_FAIL: "ai_coach_response_fail",

  AI_COACH_RESULT_VIEW: "ai_coach_result_view",
} as const;

export type AnalyticsEventName = (typeof EVENT_NAME)[keyof typeof EVENT_NAME];
