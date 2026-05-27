import { isNativeApp, requestToApp } from "@/shared/api/bridge/nativeBridge";
import {
  type ApiFailResponse,
  type ApiResponse,
  isApiSuccess,
} from "@/shared/api/types/apiResponse.types";
import { getAccessToken } from "@/shared/auth/authSession";

export type RequestOptions = {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
};

type WebRequestOptions = {
  includeAuthorization?: boolean;
};

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:8080";
  }

  throw new Error("VITE_API_BASE_URL이 설정되지 않았습니다.");
}

function appendParams(url: URL, params?: RequestOptions["params"]) {
  if (!params) return;

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;

    url.searchParams.set(key, String(value));
  });
}

function createFallbackFailResponse(response: Response): ApiFailResponse {
  return {
    message: response.statusText || "요청 처리 중 오류가 발생했습니다",
    statusCode: response.status || 500,
    error: "API_REQUEST_FAILED",
  };
}

function createApiFailResponseFromUnknown(
  error: unknown,
  {
    fallbackError = "API_REQUEST_FAILED",
    fallbackMessage = "요청 처리 중 오류가 발생했습니다",
    fallbackStatusCode = 500,
  }: {
    fallbackError?: string;
    fallbackMessage?: string;
    fallbackStatusCode?: number;
  } = {},
): ApiFailResponse {
  if (typeof error !== "object" || error === null) {
    return {
      message: fallbackMessage,
      statusCode: fallbackStatusCode,
      error: fallbackError,
    };
  }

  const {
    error: errorCode,
    message,
    statusCode,
  } = error as {
    error?: unknown;
    message?: unknown;
    statusCode?: unknown;
  };

  const parsedStatusCode =
    typeof statusCode === "number"
      ? statusCode
      : typeof statusCode === "string"
        ? Number(statusCode)
        : null;

  return {
    message: typeof message === "string" ? message : fallbackMessage,
    statusCode:
      parsedStatusCode !== null && !Number.isNaN(parsedStatusCode)
        ? parsedStatusCode
        : fallbackStatusCode,
    error: typeof errorCode === "string" ? errorCode : fallbackError,
  };
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text();

  if (!text) {
    if (response.ok) {
      return {
        message: response.statusText || "요청이 성공적으로 처리되었습니다.",
        statusCode: response.status || 200,
        data: undefined as T,
      };
    }

    return createFallbackFailResponse(response);
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      return createFallbackFailResponse(response);
    }

    return {
      message: "서버 응답을 읽지 못했습니다.",
      statusCode: response.status || 500,
      error: "API_RESPONSE_PARSE_FAILED",
    };
  }
}

export async function appApi<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  if (!isNativeApp()) {
    return {
      message: "앱 WebView 환경에서만 API 요청이 가능합니다.",
      statusCode: 500,
      error: "APP_BRIDGE_UNAVAILABLE",
    };
  }

  const { timeoutMs, ...payload } = options;
  try {
    const response = await requestToApp<ApiResponse<T>>(payload, { timeoutMs });
    return response;
  } catch (error) {
    return createApiFailResponseFromUnknown(error, {
      fallbackError: "APP_API_REQUEST_FAILED",
      fallbackMessage: "앱 API 요청 실패",
    });
  }
}

export async function webApi<T>(
  options: RequestOptions,
  webOptions?: WebRequestOptions,
): Promise<ApiResponse<T>> {
  const { endpoint, method, body, params, timeoutMs } = options;
  const url = new URL(`${getApiBaseUrl()}${endpoint}`);
  const accessToken = getAccessToken();
  appendParams(url, params);

  const headers = new Headers({
    Accept: "application/json",
  });

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (webOptions?.includeAuthorization !== false && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const abortController = timeoutMs && timeoutMs > 0 ? new AbortController() : null;
  const timeoutId = abortController
    ? window.setTimeout(() => {
        abortController.abort();
      }, timeoutMs)
    : null;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abortController?.signal,
    });

    return await parseApiResponse<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        message: "요청 시간이 초과되었습니다.",
        statusCode: 408,
        error: "REQUEST_TIMEOUT",
      };
    }

    return createApiFailResponseFromUnknown(error, {
      fallbackError: "WEB_API_REQUEST_FAILED",
      fallbackMessage: "요청 처리 중 오류가 발생했습니다",
    });
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

export function authedApi<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  return isNativeApp() ? appApi<T>(options) : webApi<T>(options);
}

export class AppApiError extends Error {
  statusCode: number;
  error: string;

  constructor(payload: ApiFailResponse) {
    super(payload.message);
    this.name = "AppApiError";
    this.statusCode = payload.statusCode;
    this.error = payload.error;
  }
}

export function toAppApiError(
  error: unknown,
  fallbackMessage = "요청 처리 중 오류가 발생했습니다",
  fallbackError = "API_REQUEST_FAILED",
) {
  if (error instanceof AppApiError) {
    return error;
  }

  return new AppApiError(
    createApiFailResponseFromUnknown(error, {
      fallbackError,
      fallbackMessage,
    }),
  );
}

function resolveApiData<T>(response: ApiResponse<T>): T {
  if (!isApiSuccess(response)) {
    throw new AppApiError(response);
  }

  return response.data;
}

export async function appApiData<T>(options: RequestOptions): Promise<T> {
  const response = await appApi<T>(options);
  return resolveApiData(response);
}

export async function webApiData<T>(
  options: RequestOptions,
  webOptions?: WebRequestOptions,
): Promise<T> {
  const response = await webApi<T>(options, webOptions);
  return resolveApiData(response);
}

export async function authedApiData<T>(options: RequestOptions): Promise<T> {
  const response = await authedApi<T>(options);
  return resolveApiData(response);
}
