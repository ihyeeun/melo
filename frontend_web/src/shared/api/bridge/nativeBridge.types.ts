import type { ApiResponse } from "@/shared/api/types/apiResponse.types";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AppTabName = "home" | "chat" | "diary" | "profile";
export type BridgeMessageContext = {
  href?: string;
};

export type ApiRequestPayload = {
  endpoint: string;
  method: HttpMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

export type WebToAppApiRequestMessage = {
  id: string;
  type: "API_REQUEST";
  payload: ApiRequestPayload;
  context?: BridgeMessageContext;
};

export type WebToAppTabSyncMessage = {
  id: string;
  type: "TAB_SYNC";
  payload: {
    tab: AppTabName;
  };
  context?: BridgeMessageContext;
};

export type WebToAppNavigationBackMessage = {
  id: string;
  type: "NAVIGATION_BACK";
  context?: BridgeMessageContext;
};

export type AppDeviceInfoPayload = {
  appVersion: string;
  appBuild: string | null;
  osName: "ios" | "android";
  osVersion: string | null;
};

export type WebToAppAppDeviceInfoRequestMessage = {
  id: string;
  type: "APP_DEVICE_INFO_REQUEST";
  context?: BridgeMessageContext;
};

export type WebToAppFeatureGuardSyncMessage = {
  id: string;
  type: "FEATURE_GUARD_SYNC";
  payload: {
    enabled: boolean;
  };
  context?: BridgeMessageContext;
};

export type WebToAppBottomSheetSyncMessage = {
  id: string;
  type: "BOTTOM_SHEET_SYNC";
  payload: {
    isOpen: boolean;
  };
  context?: BridgeMessageContext;
};

export type CameraCaptureRequestPayload = {
  quality?: number;
  mode?: "NUTRITION_LABEL" | "MENU_BOARD" | "FOOD" | "GENERAL";
};

export type WebToAppCameraCaptureMessage = {
  id: string;
  type: "CAMERA_CAPTURE_REQUEST";
  payload?: CameraCaptureRequestPayload;
  context?: BridgeMessageContext;
};

export type GalleryPickRequestPayload = {
  quality?: number;
};

export type WebToAppGalleryPickMessage = {
  id: string;
  type: "GALLERY_PICK_REQUEST";
  payload?: GalleryPickRequestPayload;
  context?: BridgeMessageContext;
};

export type ImageUploadRequestPayload = {
  endpoint: string;
  fileUri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fieldName?: string;
  method?: "POST" | "PUT";
  body?: Record<string, string | number | boolean | undefined>;
  params?: Record<string, string | number | boolean | undefined>;
};

export type WebToAppImageUploadMessage = {
  id: string;
  type: "IMAGE_UPLOAD_REQUEST";
  payload: ImageUploadRequestPayload;
  context?: BridgeMessageContext;
};

export type WebToAppMessage =
  | WebToAppApiRequestMessage
  | WebToAppTabSyncMessage
  | WebToAppNavigationBackMessage
  | WebToAppAppDeviceInfoRequestMessage
  | WebToAppFeatureGuardSyncMessage
  | WebToAppBottomSheetSyncMessage
  | WebToAppCameraCaptureMessage
  | WebToAppGalleryPickMessage
  | WebToAppImageUploadMessage;

export type CameraCaptureResponsePayload = {
  uri: string;
  width: number;
  height: number;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  base64: string | null;
};

export type AppToWebMessage<T = unknown> = {
  id: string;
  type: "API_RESPONSE" | "API_ERROR";
  payload:
    | ApiResponse<T>
    | {
        message: string;
        statusCode: number;
        error: string;
      };
};

export type BridgePingResponse = {
  ok: boolean;
  receivedAt: string;
  sentAt: number;
};
