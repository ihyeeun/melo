import type { RefObject } from "react";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { isAxiosError } from "axios";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { clearTokens } from "@/features/auth/store/tokenStore";
import { apiClient } from "@/src/shared/api/apiClient";
import { emitAuthExpired } from "@/src/shared/auth/authSessionEvents";
import { BridgeHandledError, isBridgeHandledError } from "./bridgeError";
import { beginCameraCaptureSession } from "./cameraCaptureSession";
import type {
  BridgeAppDeviceInfoPayload,
  BridgeCameraCaptureRequestPayload,
  BridgeGalleryPickRequestPayload,
  BridgeImageUploadRequestPayload,
  BridgeInAppBrowserOpenRequestPayload,
  WebToAppMessage,
} from "./bridge.types";
import { sendToWeb } from "./sendToWeb";
import { requestFromWeb } from "./requestFromWeb";
import {
  getHealthPermissionStatus,
  readStepCountRecords,
  requestHealthReadPermission,
} from "@/features/health/service/healthStep.service";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "heic", "heif", "webp"]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const NORMALIZED_UPLOAD_IMAGE_MAX_DIMENSION = 2560;
const NORMALIZED_UPLOAD_IMAGE_QUALITY = 0.9;
const NORMALIZED_UPLOAD_PRIMARY_FORMAT = SaveFormat.WEBP;
const NORMALIZED_UPLOAD_FALLBACK_FORMAT = SaveFormat.JPEG;
const DEFAULT_UPLOAD_FIELD_NAME = "file";
const SESSION_TERMINATION_ENDPOINTS = new Set(["/commonAuth/signout", "/commonAuth/delete"]);
const LOCAL_SESSION_CLEAR_ON_FAILURE_ENDPOINTS = new Set(["/commonAuth/signout"]);

type ImageFileSource = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
};

type ImageManipulationActions = NonNullable<Parameters<typeof manipulateAsync>[1]>;

type CapturedImageSource = ImageFileSource & {
  width: number;
  height: number;
  base64?: string | null;
  previewBase64?: string | null;
  previewMimeType?: string | null;
};

function resolveLowerCaseExtension(value: string | null | undefined) {
  if (!value) return null;
  const sanitized = value.split("?")[0];
  const matched = sanitized.match(/\.([a-zA-Z0-9]+)$/);
  if (!matched) return null;

  return matched[1].toLowerCase();
}

function resolveImageMimeTypeFromExtension(extension: string | null | undefined) {
  if (!extension) return null;
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (extension === "webp") return "image/webp";
  return null;
}

function resolveImageMimeType(source: ImageFileSource) {
  const normalizedMime = source.mimeType?.toLowerCase().trim();
  if (normalizedMime) return normalizedMime;

  const extensionFromName = resolveLowerCaseExtension(source.fileName);
  const mimeTypeFromName = resolveImageMimeTypeFromExtension(extensionFromName);
  if (mimeTypeFromName) return mimeTypeFromName;

  const extensionFromUri = resolveLowerCaseExtension(source.uri);
  const mimeTypeFromUri = resolveImageMimeTypeFromExtension(extensionFromUri);
  if (mimeTypeFromUri) return mimeTypeFromUri;

  return null;
}

async function resolveImageFileSize(source: ImageFileSource) {
  if (
    typeof source.fileSize === "number" &&
    Number.isFinite(source.fileSize) &&
    source.fileSize >= 0
  ) {
    return source.fileSize;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(source.uri);
    if (!fileInfo.exists) return null;
    if (typeof fileInfo.size !== "number" || !Number.isFinite(fileInfo.size) || fileInfo.size < 0) {
      return null;
    }

    return fileInfo.size;
  } catch {
    return null;
  }
}

async function normalizeCapturedImageSource(source: CapturedImageSource) {
  const mimeType = resolveImageMimeType(source);
  const extensionFromName = resolveLowerCaseExtension(source.fileName);
  const extensionFromUri = resolveLowerCaseExtension(source.uri);
  const extension = extensionFromName ?? extensionFromUri;
  const isAllowedMimeType = mimeType ? ALLOWED_IMAGE_MIME_TYPES.has(mimeType) : false;
  const isAllowedExtension = extension ? ALLOWED_IMAGE_EXTENSIONS.has(extension) : false;

  if (!isAllowedMimeType && !isAllowedExtension) {
    throw new BridgeHandledError(
      "JPG, PNG, HEIC, HEIF, WEBP 형식의 이미지만 첨부할 수 있어요.",
      400,
      "IMAGE_FORMAT_NOT_ALLOWED",
    );
  }

  const fileSize = await resolveImageFileSize(source);
  if (fileSize === null) {
    throw new BridgeHandledError(
      "이미지 용량을 확인하지 못했어요. 다시 시도해주세요.",
      400,
      "IMAGE_SIZE_UNAVAILABLE",
    );
  }

  if (fileSize > MAX_IMAGE_SIZE_BYTES) {
    throw new BridgeHandledError(
      "이미지 용량은 10MB 이하만 첨부할 수 있어요.",
      400,
      "IMAGE_SIZE_EXCEEDED",
    );
  }

  return {
    uri: source.uri,
    width: source.width,
    height: source.height,
    fileName: source.fileName ?? null,
    fileSize,
    mimeType: mimeType ?? null,
    base64: source.base64 ?? null,
    previewBase64: source.previewBase64 ?? null,
    previewMimeType: source.previewMimeType ?? null,
  };
}

function normalizeImagePickerAsset(asset: ImagePicker.ImagePickerAsset) {
  return normalizeCapturedImageSource({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    mimeType: asset.mimeType,
    base64: asset.base64,
    previewBase64: null,
    previewMimeType: null,
  });
}

function assertRelativeEndpoint(endpoint: string) {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new BridgeHandledError(
      "업로드 endpoint는 상대 경로만 허용해요.",
      400,
      "INVALID_UPLOAD_ENDPOINT",
    );
  }
}

function getNormalizedUploadMimeType(format: SaveFormat) {
  if (format === SaveFormat.WEBP) return "image/webp";
  if (format === SaveFormat.PNG) return "image/png";

  return "image/jpeg";
}

function getNormalizedUploadExtension(format: SaveFormat) {
  if (format === SaveFormat.WEBP) return "webp";
  if (format === SaveFormat.PNG) return "png";

  return "jpg";
}

function resolveNormalizedUploadFileName(source: ImageFileSource, format: SaveFormat) {
  const trimmedFileName = source.fileName?.trim();
  const rawFileName = trimmedFileName || source.uri.split("?")[0].split("/").pop() || "upload";
  const fileName = rawFileName.split("?")[0].split("/").pop() || "upload";
  const baseName = fileName.replace(/\.[a-zA-Z0-9]+$/, "").trim();

  return `${baseName || "upload"}.${getNormalizedUploadExtension(format)}`;
}

function toPositiveFiniteNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;

  return value;
}

function getNormalizedUploadImageActions(source: ImageFileSource): ImageManipulationActions {
  const width = toPositiveFiniteNumber(source.width);
  const height = toPositiveFiniteNumber(source.height);

  if (width === null || height === null) return [];
  if (Math.max(width, height) <= NORMALIZED_UPLOAD_IMAGE_MAX_DIMENSION) return [];

  return width >= height
    ? [{ resize: { width: NORMALIZED_UPLOAD_IMAGE_MAX_DIMENSION } }]
    : [{ resize: { height: NORMALIZED_UPLOAD_IMAGE_MAX_DIMENSION } }];
}

async function convertUploadImage(source: ImageFileSource, format: SaveFormat) {
  const normalizedImage = await manipulateAsync(
    source.uri,
    getNormalizedUploadImageActions(source),
    {
      compress: NORMALIZED_UPLOAD_IMAGE_QUALITY,
      format,
    },
  );
  const fileSize = await resolveImageFileSize({ uri: normalizedImage.uri });

  if (fileSize === null) {
    throw new BridgeHandledError(
      "이미지 용량을 확인하지 못했어요. 다시 시도해주세요.",
      400,
      "IMAGE_SIZE_UNAVAILABLE",
    );
  }

  if (fileSize > MAX_IMAGE_SIZE_BYTES) {
    throw new BridgeHandledError(
      "이미지 용량은 10MB 이하만 첨부할 수 있어요.",
      400,
      "IMAGE_SIZE_EXCEEDED",
    );
  }

  return {
    uri: normalizedImage.uri,
    fileName: resolveNormalizedUploadFileName(source, format),
    mimeType: getNormalizedUploadMimeType(format),
    fileSize,
  };
}

async function normalizeUploadImage(source: ImageFileSource) {
  try {
    return await convertUploadImage(source, NORMALIZED_UPLOAD_PRIMARY_FORMAT);
  } catch (error) {
    if (isBridgeHandledError(error)) {
      throw error;
    }

    try {
      return await convertUploadImage(source, NORMALIZED_UPLOAD_FALLBACK_FORMAT);
    } catch (fallbackError) {
      if (isBridgeHandledError(fallbackError)) {
        throw fallbackError;
      }
    }

    throw new BridgeHandledError(
      "이미지 파일을 처리하지 못했어요. 다시 시도해주세요.",
      400,
      "IMAGE_PROCESSING_FAILED",
    );
  }
}

async function normalizeUploadImageSource(payload: BridgeImageUploadRequestPayload) {
  const source: ImageFileSource = {
    uri: payload.fileUri,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    width: payload.width,
    height: payload.height,
  };

  const mimeType = resolveImageMimeType(source);
  const extensionFromName = resolveLowerCaseExtension(source.fileName);
  const extensionFromUri = resolveLowerCaseExtension(source.uri);
  const extension = extensionFromName ?? extensionFromUri;
  const isAllowedMimeType = mimeType ? ALLOWED_IMAGE_MIME_TYPES.has(mimeType) : false;
  const isAllowedExtension = extension ? ALLOWED_IMAGE_EXTENSIONS.has(extension) : false;

  if (!isAllowedMimeType && !isAllowedExtension) {
    throw new BridgeHandledError(
      "JPG, PNG, HEIC, HEIF, WEBP 형식의 이미지만 첨부할 수 있어요.",
      400,
      "IMAGE_FORMAT_NOT_ALLOWED",
    );
  }

  const fileSize = await resolveImageFileSize(source);
  if (fileSize === null) {
    throw new BridgeHandledError(
      "이미지 용량을 확인하지 못했어요. 다시 시도해주세요.",
      400,
      "IMAGE_SIZE_UNAVAILABLE",
    );
  }

  if (fileSize > MAX_IMAGE_SIZE_BYTES) {
    throw new BridgeHandledError(
      "이미지 용량은 10MB 이하만 첨부할 수 있어요.",
      400,
      "IMAGE_SIZE_EXCEEDED",
    );
  }

  return await normalizeUploadImage(source);
}

function resolveUploadFieldName(payloadFieldName?: string) {
  const normalized = payloadFieldName?.trim();
  if (!normalized) return DEFAULT_UPLOAD_FIELD_NAME;
  return normalized;
}

async function uploadImageToServer(payload: BridgeImageUploadRequestPayload) {
  assertRelativeEndpoint(payload.endpoint);
  const normalizedImage = await normalizeUploadImageSource(payload);
  const fieldName = resolveUploadFieldName(payload.fieldName);
  const method = payload.method ?? "POST";

  const formData = new FormData();
  formData.append(fieldName, {
    uri: normalizedImage.uri,
    name: normalizedImage.fileName,
    type: normalizedImage.mimeType,
  } as unknown as Blob);

  if (payload.body) {
    Object.entries(payload.body).forEach(([key, value]) => {
      if (value === undefined) return;
      formData.append(key, String(value));
    });
  }

  const response = await apiClient.request({
    url: payload.endpoint,
    method,
    params: payload.params,
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

async function capturePhotoFromCamera(payload?: BridgeCameraCaptureRequestPayload) {
  const captured = await beginCameraCaptureSession(payload);
  return await normalizeCapturedImageSource(captured);
}

async function pickPhotoFromGallery(payload?: BridgeGalleryPickRequestPayload) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new BridgeHandledError("갤러리 접근 권한이 필요해요.", 403, "GALLERY_PERMISSION_DENIED");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    quality: payload?.quality ?? 1,
    allowsEditing: false,
    allowsMultipleSelection: false,
    exif: false,
    base64: false,
    mediaTypes: "images",
  });

  if (result.canceled) {
    throw new BridgeHandledError("사진 선택이 취소되었어요.", 499, "GALLERY_PICK_CANCELLED");
  }

  if (result.assets.length !== 1) {
    throw new BridgeHandledError("이미지는 1장만 첨부할 수 있어요.", 400, "IMAGE_COUNT_EXCEEDED");
  }

  const asset = result.assets[0];
  if (!asset) {
    throw new BridgeHandledError("선택한 사진을 가져오지 못했어요.", 500, "GALLERY_PICK_FAILED");
  }

  return await normalizeImagePickerAsset(asset);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shouldTerminateSession(endpoint: string) {
  return SESSION_TERMINATION_ENDPOINTS.has(endpoint);
}

function shouldClearLocalSessionOnFailure(endpoint: string | null) {
  return endpoint !== null && LOCAL_SESSION_CLEAR_ON_FAILURE_ENDPOINTS.has(endpoint);
}

function resolveAppVersion() {
  const appVersion = Constants.expoConfig?.version;
  if (typeof appVersion === "string" && appVersion.trim().length > 0) {
    return appVersion.trim();
  }

  return "unknown";
}

function resolveBuildVersion() {
  const platformManifest = Constants.platform;
  const iosBuildNumber =
    platformManifest &&
    "ios" in platformManifest &&
    platformManifest.ios &&
    typeof platformManifest.ios.buildNumber === "string"
      ? platformManifest.ios.buildNumber.trim()
      : "";
  if (iosBuildNumber.length > 0) return iosBuildNumber;

  const androidVersionCode =
    platformManifest &&
    "android" in platformManifest &&
    platformManifest.android &&
    typeof platformManifest.android.versionCode === "number"
      ? platformManifest.android.versionCode
      : null;
  if (typeof androidVersionCode === "number" && Number.isFinite(androidVersionCode)) {
    return String(androidVersionCode);
  }

  return null;
}

function resolveOsVersion() {
  if (typeof Platform.Version === "string") return Platform.Version;
  if (typeof Platform.Version === "number" && Number.isFinite(Platform.Version)) {
    return String(Platform.Version);
  }

  return null;
}

function resolveAppDeviceInfo(): BridgeAppDeviceInfoPayload {
  return {
    appVersion: resolveAppVersion(),
    appBuild: resolveBuildVersion(),
    osName: Platform.OS === "android" ? "android" : "ios",
    osVersion: resolveOsVersion(),
  };
}

function isBridgePrimitiveValue(value: unknown): value is string | number | boolean | undefined {
  return (
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isBridgePrimitiveRecord(
  value: unknown,
): value is Record<string, string | number | boolean | undefined> {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isBridgePrimitiveValue);
}

function isOptionalBridgeDimension(value: unknown) {
  return value === undefined || value === null || typeof value === "number";
}

function resolveValidHttpUrl(url: string) {
  try {
    const parsedUrl = new URL(url.trim());
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl.toString();
    }
  } catch {
    // handled below
  }

  throw new BridgeHandledError("유효하지 않은 URL입니다.", 400, "INVALID_URL");
}

function openInAppBrowser(payload: BridgeInAppBrowserOpenRequestPayload) {
  const url = resolveValidHttpUrl(payload.url);

  void WebBrowser.openBrowserAsync(url).catch((error) => {
    console.warn("[Bridge] failed to open in-app browser", error);
  });

  return {
    opened: true,
  };
}

function isWebToAppMessage(value: unknown): value is WebToAppMessage {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;

  if (value.type === "API_REQUEST") {
    if (!isRecord(value.payload)) return false;
    if (typeof value.payload.endpoint !== "string") return false;
    if (typeof value.payload.method !== "string") return false;
    return true;
  }

  if (value.type === "TAB_SYNC") {
    if (!isRecord(value.payload)) return false;

    return (
      value.payload.tab === "home" ||
      value.payload.tab === "chat" ||
      value.payload.tab === "diary" ||
      value.payload.tab === "profile"
    );
  }

  if (value.type === "NAVIGATION_BACK") {
    return true;
  }

  if (value.type === "APP_DEVICE_INFO_REQUEST") {
    return true;
  }

  if (value.type === "CAMERA_CAPTURE_REQUEST") {
    if (value.payload === undefined) return true;
    if (!isRecord(value.payload)) return false;

    const isValidQuality =
      value.payload.quality === undefined || typeof value.payload.quality === "number";
    if (!isValidQuality) return false;

    return (
      value.payload.mode === undefined ||
      value.payload.mode === "NUTRITION_LABEL" ||
      value.payload.mode === "MENU_BOARD" ||
      value.payload.mode === "FOOD" ||
      value.payload.mode === "GENERAL"
    );
  }

  if (value.type === "GALLERY_PICK_REQUEST") {
    if (value.payload === undefined) return true;
    if (!isRecord(value.payload)) return false;

    return value.payload.quality === undefined || typeof value.payload.quality === "number";
  }

  if (value.type === "IMAGE_UPLOAD_REQUEST") {
    if (!isRecord(value.payload)) return false;
    if (typeof value.payload.endpoint !== "string") return false;
    if (typeof value.payload.fileUri !== "string") return false;

    const isValidFileName =
      value.payload.fileName === undefined ||
      value.payload.fileName === null ||
      typeof value.payload.fileName === "string";
    if (!isValidFileName) return false;

    const isValidMimeType =
      value.payload.mimeType === undefined ||
      value.payload.mimeType === null ||
      typeof value.payload.mimeType === "string";
    if (!isValidMimeType) return false;

    const isValidWidth = isOptionalBridgeDimension(value.payload.width);
    if (!isValidWidth) return false;

    const isValidHeight = isOptionalBridgeDimension(value.payload.height);
    if (!isValidHeight) return false;

    const isValidFieldName =
      value.payload.fieldName === undefined || typeof value.payload.fieldName === "string";
    if (!isValidFieldName) return false;

    const isValidMethod =
      value.payload.method === undefined ||
      value.payload.method === "POST" ||
      value.payload.method === "PUT";
    if (!isValidMethod) return false;

    const isValidBody =
      value.payload.body === undefined || isBridgePrimitiveRecord(value.payload.body);
    if (!isValidBody) return false;

    const isValidParams =
      value.payload.params === undefined || isBridgePrimitiveRecord(value.payload.params);
    if (!isValidParams) return false;

    return true;
  }

  if (value.type === "IN_APP_BROWSER_OPEN_REQUEST") {
    if (!isRecord(value.payload)) return false;

    return typeof value.payload.url === "string";
  }

  if (
    value.type === "HEALTH_PERMISSION_STATUS_REQUEST" ||
    value.type === "HEALTH_PERMISSION_REQUEST"
  ) {
    return true;
  }

  if (value.type === "HEALTH_STEPS_READ_REQUEST") {
    if (!isRecord(value.payload)) return false;

    return typeof value.payload.startDate === "string" && typeof value.payload.endDate === "string";
  }

  return false;
}

export async function handleWebMessage(
  event: WebViewMessageEvent,
  webViewRef: RefObject<WebView | null>,
) {
  let requestId = "unknown";
  let currentEndpoint: string | null = null;

  try {
    const rawMessage: unknown = JSON.parse(event.nativeEvent.data);
    if (!isWebToAppMessage(rawMessage)) return;
    const message = rawMessage;
    requestId = message.id;

    if (message.type === "TAB_SYNC") {
      router.replace(`/(tabs)/${message.payload.tab}`);
      return;
    }

    if (message.type === "NAVIGATION_BACK") {
      if (router.canGoBack()) {
        router.back();
      }
      return;
    }

    if (message.type === "APP_DEVICE_INFO_REQUEST") {
      const result = resolveAppDeviceInfo();

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_RESPONSE",
        payload: result,
      });
      return;
    }

    if (message.type === "CAMERA_CAPTURE_REQUEST") {
      const result = await capturePhotoFromCamera(message.payload);

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_RESPONSE",
        payload: result,
      });
      return;
    }

    if (message.type === "GALLERY_PICK_REQUEST") {
      const result = await pickPhotoFromGallery(message.payload);

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_RESPONSE",
        payload: result,
      });
      return;
    }

    if (message.type === "IMAGE_UPLOAD_REQUEST") {
      const result = await uploadImageToServer(message.payload);

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_RESPONSE",
        payload: result,
      });
      return;
    }

    if (message.type === "IN_APP_BROWSER_OPEN_REQUEST") {
      const result = openInAppBrowser(message.payload);

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_RESPONSE",
        payload: result,
      });
      return;
    }

    if (message.type === "HEALTH_PERMISSION_STATUS_REQUEST") {
      const result = await getHealthPermissionStatus();

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_RESPONSE",
        payload: result,
      });
      return;
    }

    if (message.type === "HEALTH_PERMISSION_REQUEST") {
      const result = await requestHealthReadPermission();

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_RESPONSE",
        payload: result,
      });
      return;
    }

    if (message.type === "HEALTH_STEPS_READ_REQUEST") {
      const result = await readStepCountRecords(message.payload);

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_RESPONSE",
        payload: result,
      });
      return;
    }

    currentEndpoint = message.payload.endpoint;
    const shouldEndSession = shouldTerminateSession(currentEndpoint);
    const result = await requestFromWeb(message.payload);

    if (shouldEndSession) {
      await clearTokens();
    }

    sendToWeb(webViewRef, {
      id: requestId,
      type: "API_RESPONSE",
      payload: result,
    });

    if (shouldEndSession) {
      emitAuthExpired();
    }
  } catch (error) {
    const shouldClearLocalSession = shouldClearLocalSessionOnFailure(currentEndpoint);

    if (isBridgeHandledError(error)) {
      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_ERROR",
        payload: {
          message: error.message,
          statusCode: error.statusCode,
          error: error.errorCode,
        },
      });
      if (shouldClearLocalSession) {
        await clearTokens();
        emitAuthExpired();
      }
      return;
    }

    if (isAxiosError(error)) {
      const serverData = error.response?.data;

      sendToWeb(webViewRef, {
        id: requestId,
        type: "API_ERROR",
        payload: {
          message:
            serverData?.message ??
            (error.response ? "요청 처리 중 오류가 발생했습니다." : "서버에 연결할 수 없습니다."),
          statusCode: serverData?.statusCode ?? error.response?.status ?? 503,
          error: serverData?.error ?? (error.response ? "API_REQUEST_FAILED" : "NETWORK_ERROR"),
        },
      });
      if (shouldClearLocalSession) {
        await clearTokens();
        emitAuthExpired();
      }
      return;
    }

    sendToWeb(webViewRef, {
      id: requestId,
      type: "API_ERROR",
      payload: {
        message: "앱 내부 처리 중 오류가 발생했습니다.",
        statusCode: 500,
        error: "APP_INTERNAL_ERROR",
      },
    });
    if (shouldClearLocalSession) {
      await clearTokens();
      emitAuthExpired();
    }
  }
}
