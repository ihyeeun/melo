import { HealthStepsRequestPayload } from "@/features/health/types/healthSteps.types";
import { BridgeHandledError } from "@/src/shared/api/bridge/bridgeError";
import { Platform } from "react-native";

function validateStepsRequestPayload(payload: HealthStepsRequestPayload) {
  const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_KEY_PATTERN.test(payload.startDate) || !DATE_KEY_PATTERN.test(payload.endDate)) {
    throw new BridgeHandledError("날짜 형식이 올바르지 않아요", 400, "HEALTH_INVALID_DATE_FORMAT");
  }

  if (payload.startDate > payload.endDate) {
    throw new BridgeHandledError(
      "조회 시작일이 종료일보다 늦을 수 없어요",
      400,
      "HEALTH_STEPS_INVALID_DATE_RANGE",
    );
  }
}

// 현재 권한 상태 확인
export async function getHealthPermissionStatus() {
  if (Platform.OS === "ios") {
    const { getIosHealthPermissionStatus } = await import("./healthStep.ios");
    return getIosHealthPermissionStatus();
  }

  if (Platform.OS === "android") {
    const { getAndroidHealthPermissionStatus } = await import("./healthStep.android");
    return getAndroidHealthPermissionStatus();
  }

  return {
    permissionStatus: "unknown",
    source: null,
  };
}

// 사용자에게 걸음 수 읽기 권한 요청
export async function requestHealthReadPermission() {
  if (Platform.OS === "ios") {
    const { requestIosHealthReadPermission } = await import("./healthStep.ios");
    return requestIosHealthReadPermission();
  }

  if (Platform.OS === "android") {
    const { requestAndroidHealthReadPermission } = await import("./healthStep.android");
    return requestAndroidHealthReadPermission();
  }

  return {
    permissionStatus: "unknown",
    source: null,
  };
}

// 실제 날짜별 걸음 수 읽음
export async function readStepCountRecords(payload: HealthStepsRequestPayload) {
  validateStepsRequestPayload(payload);

  if (Platform.OS === "ios") {
    const { readIosStepCountRecords } = await import("./healthStep.ios");
    return readIosStepCountRecords(payload);
  }

  if (Platform.OS === "android") {
    const { readAndroidStepCountRecords } = await import("./healthStep.android");
    return readAndroidStepCountRecords(payload);
  }

  throw new BridgeHandledError(
    "이 기기에서는 걸음 수 연동을 지원하지 않아요",
    400,
    "HEALTH_STEPS_UNSUPPORTED_PLATFORM",
  );
}
