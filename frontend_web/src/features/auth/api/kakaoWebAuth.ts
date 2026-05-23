import { AppApiError, getApiBaseUrl, webApiData } from "@/shared/api/appApi";
import { type ApiFailResponse } from "@/shared/api/types/apiResponse.types";
import { type AuthTokens, setAuthTokens } from "@/shared/auth/authSession";

export { getApiBaseUrl };

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
  endpoint,
  includeAuthorization,
  params,
}: {
  endpoint: string;
  includeAuthorization?: boolean;
  params?: Record<string, string>;
}) {
  try {
    return await webApiData<T>(
      {
        endpoint,
        method: "POST",
        params,
      },
      { includeAuthorization },
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

function normalizeHasUserInfo(value: unknown) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  if (typeof value === "object" && value !== null) {
    const payload = value as {
      hasUserInfo?: unknown;
      isRegistered?: unknown;
      registered?: unknown;
    };

    if (typeof payload.hasUserInfo === "boolean") return payload.hasUserInfo;
    if (typeof payload.isRegistered === "boolean") return payload.isRegistered;
    if (typeof payload.registered === "boolean") return payload.registered;
  }

  throw new Error("유저 정보 등록 여부 응답 형식이 올바르지 않습니다.");
}

export function redirectToKakaoWebLogin() {
  window.location.assign(`${getApiBaseUrl()}${END_POINT.KAKAO_WEB_LOGIN}`);
}

export async function exchangeKakaoWebCodeForToken(code: string) {
  const tokens = await kakaoWebAuthData<AuthTokens>({
    endpoint: END_POINT.KAKAO_WEB_CALLBACK,
    includeAuthorization: false,
    params: { code },
  });

  setAuthTokens(tokens);
}

export async function postHasUserInfo() {
  const hasUserInfo = await kakaoWebAuthData<unknown>({
    endpoint: END_POINT.HAS_USER_INFO,
  });

  return normalizeHasUserInfo(hasUserInfo);
}
