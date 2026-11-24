import { AppApiError } from "@/shared/api/apiClient";
import { API_ERROR_MESSAGE } from "@/shared/api/apiErrorMessage";

const CAMERA_CAPTURE_CANCELLED_CODE = "CAMERA_CAPTURE_CANCELLED";

type BridgeCameraError = Error & {
  error?: string;
  statusCode?: number;
};

export type CameraCaptureErrorFeedback = {
  title: string;
  description?: string;
};

// 사진을 어디서 가져왔는지. 갤러리 사진이면 '다시 촬영' 대신 '다시 고르기'로 안내한다
export type ImageFrom = "camera" | "gallery";

type CapturedImagePreviewSource = {
  uri: string;
  mimeType: string | null;
  base64: string | null;
  previewBase64?: string | null;
  previewMimeType?: string | null;
};

const WEBVIEW_PREVIEW_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const CAPTURE_FAILED: CameraCaptureErrorFeedback = {
  title: "촬영하지 못했어요",
  description: "다시 시도해주세요",
};
const IMAGE_LOAD_FAILED: CameraCaptureErrorFeedback = {
  title: "사진을 불러오지 못했어요",
  description: "다른 사진으로 다시 시도해주세요",
};

// 사진 실패 원인별 문구: 제목 = 무슨 일, 설명 = 할 일 (E3)
// 촬영 · 고르기 · 보내기 전 — 앱(카메라 · 갤러리 · 파일 검사)이 보낸 오류 코드
const CAPTURE_FAILURE_BY_CODE: Record<string, CameraCaptureErrorFeedback> = {
  CAMERA_PERMISSION_DENIED: {
    title: "카메라 권한이 필요해요",
    description: "설정에서 카메라 권한을 허용해주세요",
  },
  CAMERA_PREPARE_FAILED: CAPTURE_FAILED,
  CAMERA_DEVICE_UNAVAILABLE: CAPTURE_FAILED,
  CAMERA_CAPTURE_FAILED: CAPTURE_FAILED,
  CAMERA_CAPTURE_IN_PROGRESS: CAPTURE_FAILED,
  GALLERY_PERMISSION_DENIED: {
    title: "사진 접근 권한이 필요해요",
    description: "설정에서 사진 접근 권한을 허용해주세요",
  },
  IMAGE_COUNT_EXCEEDED: { title: "사진은 1장만 고를 수 있어요" },
  IMAGE_FORMAT_NOT_ALLOWED: {
    title: "지원하지 않는 사진 형식이에요",
    description: "JPG · PNG · HEIC · WEBP 사진을 골라주세요",
  },
  IMAGE_FORMAT_UNKNOWN: {
    title: "지원하지 않는 사진 형식이에요",
    description: "JPG · PNG · HEIC · WEBP 사진을 골라주세요",
  },
  IMAGE_SIZE_EXCEEDED: {
    title: "사진 용량이 너무 커요",
    description: "10MB 이하 사진을 골라주세요",
  },
  IMAGE_SIZE_UNAVAILABLE: IMAGE_LOAD_FAILED,
  IMAGE_PROCESSING_FAILED: IMAGE_LOAD_FAILED,
  GALLERY_PICK_FAILED: IMAGE_LOAD_FAILED,
  GALLERY_ACCESS_FAILED: IMAGE_LOAD_FAILED,
};

// 분석 — 서버가 알려 준 원인. 제목은 오류 문구 표(API_ERROR_MESSAGE)와 같고 여기서는 할 일만 붙인다
const RETAKE_GUIDE_BY_ANALYSIS_MESSAGE: Partial<Record<string, string>> = {
  [API_ERROR_MESSAGE.FOOD_IMAGE_QUALITY_LOW]: "더 선명하게 다시 촬영해주세요",
  [API_ERROR_MESSAGE.FOOD_IMAGE_TOO_SMALL]: "음식을 가까이에서 다시 촬영해주세요",
  [API_ERROR_MESSAGE.FOOD_IMAGE_BLURRY]: "더 선명하게 다시 촬영해주세요",
  [API_ERROR_MESSAGE.FOOD_IMAGE_LIGHTING_POOR]: "밝은 곳에서 다시 촬영해주세요",
  [API_ERROR_MESSAGE.FOOD_OCCLUDED_OR_CUT_OFF]: "음식 전체가 보이게 다시 촬영해주세요",
  [API_ERROR_MESSAGE.FOOD_NOT_DETECTED]: "음식이 잘 보이게 다시 촬영해주세요",
  [API_ERROR_MESSAGE.FOOD_NOT_MATCHED]: "다른 각도에서 다시 촬영해주세요",
};
const IMAGE_MISSING_MESSAGES = new Set<string>([
  API_ERROR_MESSAGE.IMAGE_REQUIRED,
  API_ERROR_MESSAGE.IMAGE_TYPE_INVALID,
]);
const GALLERY_RETRY_GUIDE = "다른 사진으로 다시 골라주세요";

const TIMEOUT_ERROR_CODES = new Set(["BRIDGE_TIMEOUT", "REQUEST_TIMEOUT"]);
const TIMEOUT_STATUS_CODES = new Set([408, 504]);

export function isCameraCaptureCancelled(error: unknown) {
  return (error as BridgeCameraError)?.error === CAMERA_CAPTURE_CANCELLED_CODE;
}

// 앱 · 서버가 보낸 오류 코드. 이벤트의 실패 이유로도 쓴다
export function getPhotoErrorCode(error: unknown) {
  const { error: errorCode, statusCode } = (error ?? {}) as BridgeCameraError;
  if (typeof errorCode === "string" && errorCode) return errorCode;
  return typeof statusCode === "number" ? String(statusCode) : "unknown";
}

function getRawErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" ? message.trim() : "";
}

export function getAnalyticsErrorMessage(error: unknown, fallback = "unknown") {
  const message = getRawErrorMessage(error);
  return message.length > 0 ? message : fallback;
}

// screen: DIET-02-008_modal-invalid-image
// 촬영 · 고르기 · 보내기 전 실패. 기기 원문은 내지 않는다
export function getCameraCaptureErrorFeedback(error: unknown): CameraCaptureErrorFeedback {
  const errorCode = (error as BridgeCameraError)?.error;
  return (errorCode && CAPTURE_FAILURE_BY_CODE[errorCode]) || CAPTURE_FAILED;
}

// 분석은 됐지만 사진에서 음식을 하나도 찾지 못했을 때 (서버 40057과 같은 안내)
export function getNoFoodDetectedFeedback(imageFrom: ImageFrom = "camera") {
  return {
    title: API_ERROR_MESSAGE.FOOD_NOT_DETECTED,
    description:
      imageFrom === "gallery" ? GALLERY_RETRY_GUIDE : "음식이 잘 보이게 다시 촬영해주세요",
  };
}

// screen: DIET-02-008_modal-analysis-failed
// 분석 실패. 보내기 전 검사(형식 · 용량)에서 막힌 것도 여기로 와서 원인별 문구를 쓴다
export function getRecognitionErrorFeedback(
  error: unknown,
  imageFrom: ImageFrom = "camera",
): CameraCaptureErrorFeedback {
  const bridgeError = (error ?? {}) as BridgeCameraError;

  if (bridgeError.error && CAPTURE_FAILURE_BY_CODE[bridgeError.error]) {
    return CAPTURE_FAILURE_BY_CODE[bridgeError.error];
  }

  if (bridgeError.error === "NETWORK_ERROR") {
    return { title: "네트워크 상태를 확인해주세요" };
  }

  if (
    TIMEOUT_ERROR_CODES.has(bridgeError.error ?? "") ||
    TIMEOUT_STATUS_CODES.has(bridgeError.statusCode ?? 0)
  ) {
    return { title: "분석 시간이 오래 걸리고 있어요", description: "잠시 후 다시 시도해주세요" };
  }

  const userMessage = error instanceof AppApiError ? error.userMessage : undefined;
  if (userMessage && IMAGE_MISSING_MESSAGES.has(userMessage)) {
    return { title: "사진을 불러오지 못했어요", description: "다시 시도해주세요" };
  }

  const retakeGuide = userMessage ? RETAKE_GUIDE_BY_ANALYSIS_MESSAGE[userMessage] : undefined;
  if (userMessage && retakeGuide) {
    return {
      title: userMessage,
      description: imageFrom === "gallery" ? GALLERY_RETRY_GUIDE : retakeGuide,
    };
  }

  return { title: "사진을 분석하지 못했어요", description: "잠시 후 다시 시도해주세요" };
}

export function getCapturedImagePreviewSrc(source: CapturedImagePreviewSource) {
  const previewBase64 = source.previewBase64?.trim();
  const previewMimeType = source.previewMimeType?.toLowerCase().trim();

  if (previewBase64 && previewMimeType && WEBVIEW_PREVIEW_MIME_TYPES.has(previewMimeType)) {
    return `data:${previewMimeType};base64,${previewBase64}`;
  }

  const mimeType = source.mimeType?.toLowerCase().trim() ?? "image/jpeg";

  if (
    source.base64 &&
    source.base64.trim().length > 0 &&
    WEBVIEW_PREVIEW_MIME_TYPES.has(mimeType)
  ) {
    return `data:${mimeType};base64,${source.base64}`;
  }

  return null;
}
