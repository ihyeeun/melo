import { HOME_ONBOARDING_STORAGE_KEY } from "@/features/home/constants/homeOnboarding";
import { appApiData } from "@/shared/api/appApi";
import { clearAuthTokens } from "@/shared/auth/authSession";

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

  clearAuthTokens();
  window.localStorage.removeItem(HOME_ONBOARDING_STORAGE_KEY);
}

export async function withdraw() {
  await appApiData({
    endpoint: "/commonAuth/delete",
    method: "POST",
  });

  window.localStorage.removeItem(HOME_ONBOARDING_STORAGE_KEY);
}
