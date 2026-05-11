import { HOME_ONBOARDING_STORAGE_KEY } from "@/features/home/constants/homeOnboarding";
import { appApiData } from "@/shared/api/appApi";

export async function logout() {
  await appApiData({
    endpoint: "/commonAuth/signout",
    method: "POST",
    body: {},
  });

  window.localStorage.removeItem(HOME_ONBOARDING_STORAGE_KEY);
}

export async function withdraw() {
  await appApiData({
    endpoint: "/commonAuth/delete",
    method: "POST",
  });

  window.localStorage.removeItem(HOME_ONBOARDING_STORAGE_KEY);
}
