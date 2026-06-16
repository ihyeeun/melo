import { API_BASE_URL, AppApiError, webApiData } from "@/shared/api/apiClient";
import { type ApiFailResponse } from "@/shared/api/types/apiResponse.types";

import { getWebAuthAccessToken, setWebAuthAccessToken } from "./webAuthApi";

const END_POINT = {
  KAKAO_WEB_LOGIN: "/userAuth/kakao/web",
  KAKAO_WEB_CALLBACK: "/userAuth/kakao/web/callback",
  HAS_USER_INFO: "/userAuth/hasUserInfo",
};

export class KakaoWebAuthApiError extends Error {
  statusCode: number;
  error: string;

  constructor(payload: ApiFailResponse) {
    super(payload.message);
    this.name = "KakaoWebAuthApiError";
    this.statusCode = payload.statusCode;
    this.error = payload.error;
  }
}

async function kakaoWebAuthData<T>({
  bearerToken,
  endpoint,
  params,
}: {
  bearerToken?: string | null;
  endpoint: string;
  params?: Record<string, string>;
}) {
  try {
    return await webApiData<T>(
      {
        endpoint,
        method: "POST",
        params,
      },
      { bearerToken },
    );
  } catch (error) {
    if (error instanceof AppApiError) {
      throw new KakaoWebAuthApiError({
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
      });
    }

    throw error;
  }
}

export function redirectToKakaoWebLogin() {
  window.location.assign(`${API_BASE_URL}${END_POINT.KAKAO_WEB_LOGIN}`);
}

type KakaoWebTokenResponse = {
  accessToken: string;
};

export async function exchangeKakaoWebCodeForToken(code: string) {
  const tokens = await kakaoWebAuthData<KakaoWebTokenResponse>({
    endpoint: END_POINT.KAKAO_WEB_CALLBACK,
    params: { code },
  });

  setWebAuthAccessToken(tokens.accessToken);
}

export async function postHasUserInfo() {
  const hasUserInfo = await kakaoWebAuthData<boolean>({
    bearerToken: getWebAuthAccessToken(),
    endpoint: END_POINT.HAS_USER_INFO,
  });

  return hasUserInfo;
}
