import type { HealthStepsRequestPayload } from "@/features/health/types/healthSteps.types";
import type { NativeHapticType } from "@/src/shared/native/haptics";
import type { AppTabName } from "@/src/shared/navigation/appTabNavigation";

export type BridgeHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type BridgeMessageContext = {
  href?: string;
};

export type BridgeRequestPayload = {
  endpoint: string;
  method: BridgeHttpMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

export type BridgeApiRequestMessage = {
  id: string;
  type: "API_REQUEST";
  payload: BridgeRequestPayload;
  context?: BridgeMessageContext;
};

export type BridgeApiCancelMessage = {
  id: string;
  type: "API_CANCEL";
  context?: BridgeMessageContext;
};

export type BridgeTabSyncMessage = {
  id: string;
  type: "TAB_SYNC";
  payload: {
    tab: AppTabName;
  };
  context?: BridgeMessageContext;
};

export type BridgeNavigationBackMessage = {
  id: string;
  type: "NAVIGATION_BACK";
  context?: BridgeMessageContext;
};

export type BridgeHapticTriggerRequestPayload = {
  type?: NativeHapticType;
};

export type BridgeHapticTriggerRequestMessage = {
  id: string;
  type: "HAPTIC_TRIGGER_REQUEST";
  payload?: BridgeHapticTriggerRequestPayload;
  context?: BridgeMessageContext;
};

export type BridgeAppFeature =
  | "OPEN_APP_SETTINGS"
  | "SIGN_UP_REDIRECT"
  | "LOCATION_CHECK_WITHOUT_PROMPT"
  // 회원가입 중 로그아웃(signout)하면 로그인 화면으로 돌아간다
  | "SIGN_OUT_FROM_SIGN_UP";

export type BridgeAppDeviceInfoPayload = {
  appVersion: string;
  appBuild: string | null;
  osName: "ios" | "android";
  osVersion: string | null;
  supportedFeatures: BridgeAppFeature[];
};

export type BridgeAppDeviceInfoRequestMessage = {
  id: string;
  type: "APP_DEVICE_INFO_REQUEST";
  context?: BridgeMessageContext;
};

export type BridgeAppUpdateApplyRequestMessage = {
  id: string;
  type: "APP_UPDATE_APPLY_REQUEST";
  context?: BridgeMessageContext;
};

export type BridgeAppSettingsOpenRequestMessage = {
  id: string;
  type: "APP_SETTINGS_OPEN_REQUEST";
  context?: BridgeMessageContext;
};

export type BridgeSignUpRedirectRequestMessage = {
  id: string;
  type: "SIGN_UP_REDIRECT_REQUEST";
  context?: BridgeMessageContext;
};

export type BridgeCameraCaptureMode = "NUTRITION_LABEL" | "MENU_BOARD" | "FOOD" | "GENERAL";

export type BridgeCameraCaptureRequestPayload = {
  mode?: BridgeCameraCaptureMode;
  selectableModes?: BridgeCameraCaptureMode[];
};

export type BridgeCameraCaptureRequestMessage = {
  id: string;
  type: "CAMERA_CAPTURE_REQUEST";
  payload?: BridgeCameraCaptureRequestPayload;
  context?: BridgeMessageContext;
};

export type BridgeGalleryPickRequestPayload = {
  quality?: number;
};

export type BridgeGalleryPickRequestMessage = {
  id: string;
  type: "GALLERY_PICK_REQUEST";
  payload?: BridgeGalleryPickRequestPayload;
  context?: BridgeMessageContext;
};

export type BridgeImageUploadRequestPayload = {
  endpoint: string;
  fileUri: string;
  fileName?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  fieldName?: string;
  method?: "POST" | "PUT";
  body?: Record<string, string | number | boolean | undefined>;
  params?: Record<string, string | number | boolean | undefined>;
};

export type BridgeImageUploadRequestMessage = {
  id: string;
  type: "IMAGE_UPLOAD_REQUEST";
  payload: BridgeImageUploadRequestPayload;
  context?: BridgeMessageContext;
};

export type BridgeInAppBrowserOpenRequestPayload = {
  url: string;
};

export type BridgeInAppBrowserOpenRequestMessage = {
  id: string;
  type: "IN_APP_BROWSER_OPEN_REQUEST";
  payload: BridgeInAppBrowserOpenRequestPayload;
  context?: BridgeMessageContext;
};

export type BridgeHealthPermissionStatusRequestMessage = {
  id: string;
  type: "HEALTH_PERMISSION_STATUS_REQUEST";
  context?: BridgeMessageContext;
};

export type BridgeHealthPermissionRequestMessage = {
  id: string;
  type: "HEALTH_PERMISSION_REQUEST";
  context?: BridgeMessageContext;
};

export type BridgeHealthStepsReadRequestMessage = {
  id: string;
  type: "HEALTH_STEPS_READ_REQUEST";
  payload: HealthStepsRequestPayload;
  context?: BridgeMessageContext;
};

export type BridgeLocationRequestPayload = {
  // false면 권한 팝업 없이 지금 권한 상태로만 위치를 찾는다
  askPermission?: boolean;
};

export type BridgeLocationRequestMessage = {
  id: string;
  type: "LOCATION_REQUEST";
  payload?: BridgeLocationRequestPayload;
  context?: BridgeMessageContext;
};

export type WebToAppMessage =
  | BridgeApiRequestMessage
  | BridgeApiCancelMessage
  | BridgeTabSyncMessage
  | BridgeNavigationBackMessage
  | BridgeHapticTriggerRequestMessage
  | BridgeAppDeviceInfoRequestMessage
  | BridgeAppUpdateApplyRequestMessage
  | BridgeAppSettingsOpenRequestMessage
  | BridgeSignUpRedirectRequestMessage
  | BridgeCameraCaptureRequestMessage
  | BridgeGalleryPickRequestMessage
  | BridgeImageUploadRequestMessage
  | BridgeInAppBrowserOpenRequestMessage
  | BridgeHealthPermissionStatusRequestMessage
  | BridgeHealthPermissionRequestMessage
  | BridgeHealthStepsReadRequestMessage
  | BridgeLocationRequestMessage;

// 에러 코드만으로는 웹이 다음 행동을 정할 수 없을 때 함께 넘기는 정보
export type BridgeErrorDetail = {
  // LOCATION_PERMISSION_DENIED: OS가 권한 팝업을 다시 띄울 수 있는지
  canAskAgain?: boolean;
};

export type BridgeErrorPayload = BridgeErrorDetail & {
  message: string;
  statusCode: number;
  error: string;
};

export type AppToWebMessage<T = unknown> =
  | {
      id: string;
      type: "API_RESPONSE";
      payload: T;
    }
  | {
      id: string;
      type: "API_ERROR";
      payload: BridgeErrorPayload;
    };
