export const DEFAULT_CAMERA_CAPTURE_QUALITY = 1;
const CAMERA_CAPTURE_CANCELLED_CODE = "CAMERA_CAPTURE_CANCELLED";
const CAMERA_PERMISSION_DENIED_CODES = new Set(["CAMERA_PERMISSION_DENIED"]);

type BridgeCameraError = Error & {
  error?: string;
  statusCode?: number;
};

export type CameraCaptureErrorFeedback = {
  title: string;
  description: string;
};
type RecognitionDomain = "NUTRITION_LABEL" | "FOOD" | "MENU_BOARD";

type RecognitionErrorCopy = {
  title: string;
  fallbackMessage: string;
  retryGuide: string;
};

type CapturedImagePreviewSource = {
  uri: string;
  mimeType: string | null;
  base64: string | null;
};

const IMAGE_RECOGNITION_ERROR_MESSAGE_BY_SERVER_MESSAGE: Record<string, string> = {
  "image file is required": "이미지 파일이 누락되었어요.",
  "image file must be an image": "지원하지 않는 이미지 형식이에요.",
  "food image quality is too low": "사진 화질이 너무 낮아요.",
  "food in image is too small": "사진 속 음식이 너무 작게 보여요.",
  "food image is too blurry": "사진이 흐려요.",
  "food image lighting is too poor": "조명이 좋지 않아 인식하기 어려워요.",
  "food is occluded or cut off": "음식이 가려졌거나 잘려 있어요.",
  "no food detected in image": "사진에서 음식을 찾을 수 없어요.",
  "no recognizable menu matched candidates": "사진 속 음식이 후보 메뉴와 매칭되지 않았어요.",
};

const RECOGNITION_ERROR_COPY: Record<RecognitionDomain, RecognitionErrorCopy> = {
  NUTRITION_LABEL: {
    title: "영양성분 인식에 실패했어요",
    fallbackMessage: "영양성분 분석에 실패했어요.",
    retryGuide: "영양성분표 전체가 선명하게 보이도록 다시 촬영해주세요.",
  },
  FOOD: {
    title: "음식을 인식하기 어려웠어요",
    fallbackMessage: "음식 메뉴 분석에 실패했어요.",
    retryGuide: "음식이 잘 보이도록 다시 촬영해주세요.",
  },
  MENU_BOARD: {
    title: "메뉴판 인식에 실패했어요",
    fallbackMessage: "메뉴판 분석에 실패했어요.",
    retryGuide: "메뉴판 전체가 선명하게 보이도록 다시 촬영해주세요.",
  },
};

export function isCameraCaptureCancelled(error: unknown) {
  return (error as BridgeCameraError)?.error === CAMERA_CAPTURE_CANCELLED_CODE;
}

function getRawErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" ? message.trim() : "";
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = getRawErrorMessage(error);

  if (message.length > 0) return message;

  return fallback;
}

function getImageRecognitionErrorMessage(error: unknown) {
  const message = getRawErrorMessage(error);

  return IMAGE_RECOGNITION_ERROR_MESSAGE_BY_SERVER_MESSAGE[message] ?? null;
}

export function getAnalyticsErrorMessage(error: unknown, fallback = "unknown") {
  return getImageRecognitionErrorMessage(error) ?? getErrorMessage(error, fallback);
}

function isCameraPermissionDenied(error: unknown) {
  return CAMERA_PERMISSION_DENIED_CODES.has((error as BridgeCameraError)?.error ?? "");
}

export function getCameraCaptureErrorMessage(error: unknown) {
  return getErrorMessage(error, "카메라를 실행하지 못했어요");
}

export function getCameraCaptureErrorFeedback(error: unknown): CameraCaptureErrorFeedback {
  if (isCameraPermissionDenied(error)) {
    return {
      title: "카메라 권한이 필요해요",
      description: "설정에서 카메라 권한을 허용한 뒤 다시 촬영해주세요.",
    };
  }

  const message = getCameraCaptureErrorMessage(error);

  return {
    title: "촬영에 실패했어요",
    description: `${message}`,
  };
}

export function getRecognitionErrorFeedback(
  domain: RecognitionDomain,
  error?: unknown,
): CameraCaptureErrorFeedback {
  // const statusCode = (error as BridgeCameraError)?.statusCode;
  // if (typeof statusCode === "number" && statusCode >= 500) {
  //   return {
  //     title: "서버 응답이 불안정해요",
  //     description: "잠시 후 다시 시도해주세요.",
  //   };
  // }

  const copy = RECOGNITION_ERROR_COPY[domain];
  const message =
    getImageRecognitionErrorMessage(error) ?? getErrorMessage(error, copy.fallbackMessage);

  return {
    title: copy.title,
    description: `${message}\n${copy.retryGuide} `,
  };
}

export function getCapturedImagePreviewSrc(source: CapturedImagePreviewSource) {
  if (source.base64 && source.base64.trim().length > 0) {
    const mimeType = source.mimeType ?? "image/jpeg";
    return `data:${mimeType};base64,${source.base64}`;
  }

  return source.uri;
}
