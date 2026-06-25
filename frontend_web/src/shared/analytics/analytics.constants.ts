export const EVENT_NAME = {
  APP_OPEN: "app_open",
  SCREEN_VIEW: "screen_view",

  OCR_SCAN_START: "ocr_scan_start",
  OCR_SCAN_SUCCESS: "ocr_scan_success",
  OCR_SCAN_FAIL: "ocr_scan_fail",
  OCR_SCAN_CANCEL: "ocr_scan_cancel",

  OCR_RESULT_VIEW: "ocr_result_view",
  OCR_RESULT_CONFIRM: "ocr_result_confirm",

  FOOD_SCAN_START: "food_scan_start",
  FOOD_SCAN_SUCCESS: "food_scan_success",
  FOOD_SCAN_FAIL: "food_scan_fail",
  FOOD_SCAN_CANCEL: "food_scan_cancel",

  LABEL_SCAN_START: "label_scan_start",
  LABEL_SCAN_SUCCESS: "label_scan_success",
  LABEL_SCAN_FAIL: "label_scan_fail",
  LABEL_SCAN_CANCEL: "label_scan_cancel",

  LABEL_REGISTER_SUCCESS: "label_register_success",
  LABEL_REGISTER_FAIL: "label_register_fail",

  AI_COACH_CHAT: "ai_coach_chat",
  AI_COACH_RESPONSE_SUCCESS: "ai_coach_response_success",
  AI_COACH_RESPONSE_FAIL: "ai_coach_response_fail",

  RECOMMEND_MENU_SAVE: "recommend_menu_save",
  RECOMMEND_MENU_CANCEL: "recommend_menu_cancel",

  USER_PROFILE_UPDATED: "user_profile_updated",

  CLICK_FEEDBACK_BUTTON: "click_feedback_button",
} as const;

export type AnalyticsEventName = (typeof EVENT_NAME)[keyof typeof EVENT_NAME];
