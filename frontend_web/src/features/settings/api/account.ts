import { CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY } from "@/features/chat/constants/mealRecordModeOnboarding";
import { MENSTRUAL_PHASE_SETTING_STORAGE_KEY } from "@/features/personal-analysis/constants/personalAnalysis.constant";
import { appApiData } from "@/shared/api/apiClient";
import { isRequestAbortError } from "@/shared/api/requestCancellation";

export async function logout() {
  try {
    await appApiData({
      endpoint: "/commonAuth/signout",
      method: "POST",
      body: {},
    });
  } catch (error) {
    if (isRequestAbortError(error)) throw error;
    console.warn("Remote signout failed. Clearing local session only.", error);
  }

  window.localStorage.removeItem(CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY);
  window.localStorage.removeItem(MENSTRUAL_PHASE_SETTING_STORAGE_KEY);
}

export async function withdraw() {
  await appApiData({
    endpoint: "/commonAuth/delete",
    method: "POST",
  });

  window.localStorage.removeItem(CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY);
  window.localStorage.removeItem(MENSTRUAL_PHASE_SETTING_STORAGE_KEY);
}
