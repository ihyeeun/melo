import { loadRefreshToken } from "@/features/auth/store/tokenStore";
import { apiClient } from "@/src/shared/api/apiClient";
import { CanceledError } from "axios";
import type { BridgeRequestPayload } from "./bridge.types";

const SIGN_OUT_ENDPOINT = "/commonAuth/signout";

function assertAllowedBridgeRequest(endpoint: string, method: BridgeRequestPayload["method"]) {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new Error("브리지 요청은 앱 내부 상대 경로만 허용합니다.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function resolveRequestBody(payload: BridgeRequestPayload) {
  if (payload.endpoint !== SIGN_OUT_ENDPOINT) {
    return payload.body;
  }

  const refreshToken = await loadRefreshToken();

  if (!refreshToken) {
    throw new Error("로그아웃을 위한 refreshToken이 없습니다.");
  }

  const baseBody = isRecord(payload.body) ? payload.body : {};

  return {
    ...baseBody,
    refreshToken,
  };
}

export async function requestFromWeb(payload: BridgeRequestPayload, signal?: AbortSignal) {
  if (signal?.aborted) throw new CanceledError();
  const { endpoint, method, params } = payload;

  assertAllowedBridgeRequest(endpoint, method);
  const body = await resolveRequestBody(payload);
  if (signal?.aborted) throw new CanceledError();

  const response = await apiClient.request({
    url: endpoint,
    method,
    params,
    data: body,
    signal,
  });

  return response.data;
}
