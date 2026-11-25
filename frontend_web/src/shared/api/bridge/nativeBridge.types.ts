import type { ApiResponse } from "@/shared/api/types/apiResponse.types";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AppTabName = "home" | "chat" | "diary" | "restaurant" | "analysis" | "profile";
export type OptionalTabName = Extract<AppTabName, "diary" | "restaurant" | "analysis">;
// 앱 탭바에 그릴 탭 하나. label이 없으면 앱의 기본 이름을 쓴다
export type AppTabConfigItem = {
  tab: AppTabName;
  label?: string;
};
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

export type WebToAppApiCancelMessage = {
  id: string;
  type: "API_CANCEL";
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

export type WebToAppTabConfigSetMessage = {
  id: string;
  type: "TAB_CONFIG_SET";
  context?: BridgeMessageContext;
  payload: {
    optionalTabs: readonly OptionalTabName[];
    // 탭바의 구성과 순서. 이 값을 모르는 이전 버전 앱은 optionalTabs만 쓴다
    tabs?: readonly AppTabConfigItem[];
  };
};

export type WebToAppNavigationBackMessage = {
  id: string;
  type: "NAVIGATION_BACK";
  context?: BridgeMessageContext;
};

export type HapticType =
  | "tap"
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

export type HapticTriggerRequestPayload = {
  type?: HapticType;
};

export type WebToAppHapticTriggerRequestMessage = {
  id: string;
  type: "HAPTIC_TRIGGER_REQUEST";
  payload?: HapticTriggerRequestPayload;
  context?: BridgeMessageContext;
};

// 앱이 지원하는 브리지 기능. OTA는 앱 버전을 바꾸지 않아서 버전 대신 이 목록으로 구분한다
// (목록이 없는 옛 앱은 아무것도 지원하지 않는 것으로 본다)
export type AppFeature =
  | "OPEN_APP_SETTINGS"
  | "SIGN_UP_REDIRECT"
  | "LOCATION_CHECK_WITHOUT_PROMPT"
  // 회원가입 중 로그아웃(signout)하면 앱이 로그인 화면으로 돌아간다
  | "SIGN_OUT_FROM_SIGN_UP";

export type AppDeviceInfoPayload = {
  appVersion: string;
  appBuild: string | null;
  osName: "ios" | "android";
  osVersion: string | null;
  supportedFeatures?: AppFeature[];
};

export type WebToAppAppDeviceInfoRequestMessage = {
  id: string;
  type: "APP_DEVICE_INFO_REQUEST";
  context?: BridgeMessageContext;
};

export type WebToAppAppUpdateApplyRequestMessage = {
  id: string;
  type: "APP_UPDATE_APPLY_REQUEST";
  context?: BridgeMessageContext;
};

// 휴대폰 설정 앱의 멜로 권한 화면을 연다
export type WebToAppAppSettingsOpenRequestMessage = {
  id: string;
  type: "APP_SETTINGS_OPEN_REQUEST";
  context?: BridgeMessageContext;
};

// 가입을 마치지 않은 계정을 앱의 회원가입 화면으로 보낸다
export type WebToAppSignUpRedirectRequestMessage = {
  id: string;
  type: "SIGN_UP_REDIRECT_REQUEST";
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

export type WebToAppTabBarVisibilitySyncMessage = {
  id: string;
  type: "TAB_BAR_VISIBILITY_SYNC";
  payload: {
    isHidden: boolean;
  };
  context?: BridgeMessageContext;
};

export type CameraCaptureMode = "NUTRITION_LABEL" | "MENU_BOARD" | "FOOD" | "GENERAL";

export type CameraCaptureRequestPayload = {
  mode?: CameraCaptureMode;
  selectableModes?: CameraCaptureMode[];
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
  width?: number | null;
  height?: number | null;
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

export type InAppBrowserOpenRequestPayload = {
  url: string;
};

export type InAppBrowserOpenResponsePayload = {
  opened: boolean;
};

export type WebToAppInAppBrowserOpenMessage = {
  id: string;
  type: "IN_APP_BROWSER_OPEN_REQUEST";
  payload: InAppBrowserOpenRequestPayload;
  context?: BridgeMessageContext;
};

export type CurrentLocationPayload = {
  latitude: number;
  longitude: number;
};

export type LocationRequestPayload = {
  // false면 권한 팝업 없이 지금 권한 상태로만 위치를 찾는다
  askPermission?: boolean;
};

export type WebToAppLocationRequestMessage = {
  id: string;
  type: "LOCATION_REQUEST";
  payload?: LocationRequestPayload;
  context?: BridgeMessageContext;
};

export type WebToAppMessage =
  | WebToAppApiRequestMessage
  | WebToAppApiCancelMessage
  | WebToAppTabSyncMessage
  | WebToAppTabConfigSetMessage
  | WebToAppNavigationBackMessage
  | WebToAppHapticTriggerRequestMessage
  | WebToAppAppDeviceInfoRequestMessage
  | WebToAppAppUpdateApplyRequestMessage
  | WebToAppAppSettingsOpenRequestMessage
  | WebToAppSignUpRedirectRequestMessage
  | WebToAppFeatureGuardSyncMessage
  | WebToAppTabBarVisibilitySyncMessage
  | WebToAppCameraCaptureMessage
  | WebToAppGalleryPickMessage
  | WebToAppImageUploadMessage
  | WebToAppInAppBrowserOpenMessage
  | WebToAppHealthPermissionStatusRequestMessage
  | WebToAppHealthPermissionRequestMessage
  | WebToAppHealthStepsReadMessage
  | WebToAppLocationRequestMessage;

export type CameraCaptureResponsePayload = {
  uri: string;
  width: number;
  height: number;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  base64: string | null;
  previewBase64: string | null;
  previewMimeType: string | null;
  mode?: CameraCaptureMode | null;
  // 촬영했는지, 카메라 화면의 갤러리에서 골랐는지. 옛 앱은 보내지 않는다
  imageFrom?: "camera" | "gallery";
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
        // LOCATION_PERMISSION_DENIED: OS가 권한 팝업을 다시 띄울 수 있는지 (옛 앱은 보내지 않는다)
        canAskAgain?: boolean;
        // 찍거나 고른 사진이 형식 · 용량 검사에서 막혔을 때: 어떤 모드로, 어디서 가져온 사진인지 (옛 앱은 없음)
        mode?: string | null;
        imageFrom?: "camera" | "gallery";
      };
};

export type BridgePingResponse = {
  ok: boolean;
  receivedAt: string;
  sentAt: number;
};

export type HealthPermissionStatus =
  | "granted"
  | "denied"
  | "not_determined"
  | "restricted"
  | "unknown";

export type HealthConnectionSource = "apple_health" | "health_connect" | null;

export type HealthPermissionResponsePayload = {
  permissionStatus: HealthPermissionStatus;
  source: HealthConnectionSource;
};

export type HealthStepsReadRequestPayload = {
  startDate: string;
  endDate: string;
};

export type HealthStepCountRecord = {
  date: string;
  steps: number;
  source: Exclude<HealthConnectionSource, null>;
};

export type HealthStepCountResponsePayload = {
  records: HealthStepCountRecord[];
  readAt?: string;
};

export type WebToAppHealthPermissionStatusRequestMessage = {
  id: string;
  type: "HEALTH_PERMISSION_STATUS_REQUEST";
  context?: BridgeMessageContext;
};

export type WebToAppHealthPermissionRequestMessage = {
  id: string;
  type: "HEALTH_PERMISSION_REQUEST";
  context?: BridgeMessageContext;
};

export type WebToAppHealthStepsReadMessage = {
  id: string;
  type: "HEALTH_STEPS_READ_REQUEST";
  payload: HealthStepsReadRequestPayload;
  context?: BridgeMessageContext;
};
