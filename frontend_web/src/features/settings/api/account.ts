import { CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY } from "@/features/chat/constants/mealRecordModeOnboarding";
import { appApiData } from "@/shared/api/apiClient";

export async function logout() {
  try {
    await appApiData({
      endpoint: "/commonAuth/signout",
      method: "POST",
      body: {},
    });
  } catch (error) {
    console.warn("Remote signout failed. Clearing local session only.", error);
  }

  window.localStorage.removeItem(CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY);
}

export async function withdraw() {
  await appApiData({
    endpoint: "/commonAuth/delete",
    method: "POST",
  });

  window.localStorage.removeItem(CHAT_MEAL_RECORD_MODE_ONBOARDING_STORAGE_KEY);
}
