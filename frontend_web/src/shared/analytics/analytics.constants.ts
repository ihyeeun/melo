export const EVENT_NAME = {
  APP_OPEN: "app_open",
  VITE_PRELOAD_ERROR: "vite_preload_error",
  SCREEN_VIEW: "screen_view",

  // 단계별 진입은 screen_view의 path(/onboarding?step=...)로 본다
  SIGN_UP_COMPLETE: "sign_up_complete",
  SIGN_UP_FAIL: "sign_up_fail",

  RESTAURANT_TAB_ENTER: "restaurant_tab",
  RESTAURANT_SEARCH_FOCUS: "restaurant_search_focus",
  RESTAURANT_SEARCH: "restaurant_search",
  RESTAURANT_CARD_CLICK: "restaurant_card_click",
  RESTAURANT_MENU_TAB_CLICK: "restaurant_menu_tab_click",

  CAMERA_FAIL: "camera_fail",

  OCR_SCAN_START: "ocr_scan_start",
  OCR_SCAN_SUCCESS: "ocr_scan_success",
  OCR_SCAN_FAIL: "ocr_scan_fail",

  FOOD_SCAN_START: "food_scan_start",
  FOOD_SCAN_SUCCESS: "food_scan_success",
  FOOD_SCAN_FAIL: "food_scan_fail",

  LABEL_SCAN_START: "label_scan_start",
  LABEL_SCAN_SUCCESS: "label_scan_success",
  LABEL_SCAN_FAIL: "label_scan_fail",

  LABEL_REGISTER_FAIL: "label_register_fail",

  TEXT_RECORD_SUCCESS: "text_record_success",
  TEXT_RECORD_FAIL: "text_record_fail",

  AI_COACH_CHAT: "ai_coach_chat",

  RECOMMEND_MENU_SAVE: "chat_menu_save",
  // 서버 저장이 성공한 순간에 한 번 (식사 기록 상세 [완료하기] · AI 코치 시간대 카드 · 등록 완료 카드)
  MENU_SAVE: "menu_save",

  BODY_WEIGHT_RECORDED: "body_weight_recorded",

  WORKOUT_RECORD_COMPLETED: "workout_record_completed",

  CLICK_MENSTRUAL_DASHBOARD: "click_menstrual_dashboard",
  MENSTRUAL_RECORDED: "menstrual_recorded",

  CLICK_MY_MANAGEMENT_AI_COACH: "click_my_management_ai_coach",
  CLICK_MEAL_FEEDBACK_AI_COACH: "click_meal_feedback_ai_coach",
  CLICK_MANAGEMENT_PATTERN_ANALYSIS: "click_management_pattern_analysis",

  WATER_INTAKE_RECORD_COMPLETED: "water_intake_recorded",
} as const;

export type AnalyticsEventName = (typeof EVENT_NAME)[keyof typeof EVENT_NAME];
