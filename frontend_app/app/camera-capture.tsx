import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageSourcePropType,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BridgeHandledError } from "@/src/shared/api/bridge/bridgeError";
import {
  getPendingCameraCapturePayload,
  hasPendingCameraCaptureSession,
  rejectCameraCaptureSession,
  resolveCameraCaptureSession,
} from "@/src/shared/api/bridge/cameraCaptureSession";
import type {
  BridgeCameraCaptureMode,
  BridgeCameraCaptureRequestPayload,
} from "@/src/shared/api/bridge/bridge.types";
import { typography } from "@/src/shared/styles/tokens";

type CameraCaptureMode = BridgeCameraCaptureMode;
type CameraPermissionStatus = Awaited<ReturnType<typeof Camera.getCameraPermissionStatus>>;

const DEFAULT_CAPTURE_MODE: CameraCaptureMode = "NUTRITION_LABEL";
const CAMERA_ONBOARDING_DONE_VALUE = "done";
const PREVIEW_THUMBNAIL_MAX_DIMENSION = 720;
const PREVIEW_THUMBNAIL_QUALITY = 0.82;
const PREVIEW_THUMBNAIL_PRIMARY_FORMAT = SaveFormat.WEBP;
const PREVIEW_THUMBNAIL_FALLBACK_FORMAT = SaveFormat.JPEG;
const CAMERA_TOP_BAR_CONTENT_HEIGHT = 58;
const CAMERA_BOTTOM_BAR_CONTENT_HEIGHT = 76;
const CAMERA_CAPTURE_MODES: CameraCaptureMode[] = [
  "NUTRITION_LABEL",
  "MENU_BOARD",
  "FOOD",
  "GENERAL",
];

type ImageManipulationActions = NonNullable<Parameters<typeof manipulateAsync>[1]>;
type PreviewThumbnail = {
  base64: string;
  mimeType: string;
};

const SYSTEM_ICON_IMAGES = {
  close: require("@/assets/images/system-icons/close.png"),
  menuboard: require("@/assets/images/system-icons/menuboard.png"),
  food: require("@/assets/images/system-icons/food.png"),
  nutritionlabel: require("@/assets/images/system-icons/nutritionlabel.png"),
  gallery: require("@/assets/images/system-icons/gallery.png"),
} satisfies Record<string, ImageSourcePropType>;

type CameraOnboardingConfig = {
  title: string;
  description: string;
  image: ImageSourcePropType;
};

const CAMERA_ONBOARDING_CONFIG: Partial<Record<CameraCaptureMode, CameraOnboardingConfig>> = {
  NUTRITION_LABEL: {
    title: "영양성분표 사진을 촬영해주세요",
    description: "최대한 정보가 잘 읽히도록\n빛 반사나 왜곡 없이 올려주세요",
    image: require("@/assets/images/Icon/camera-onboarding-nutrient.png"),
  },
  MENU_BOARD: {
    title: "메뉴판이 잘 보이도록 촬영해주세요",
    description: "최대한 정보가 잘 읽히도록\n빛 반사나 왜곡 없이 올려주세요",
    image: require("@/assets/images/Icon/camera-onboarding-menu.png"),
  },
  FOOD: {
    title: "음식이 잘 보이도록 촬영해주세요",
    description: "화면 프레임 안에 음식이\n들어갈 수 있도록 촬영해주세요",
    image: require("@/assets/images/Icon/camera-onboarding-food.png"),
  },
};

const CAMERA_MODE_SELECTOR_CONFIG: Record<
  CameraCaptureMode,
  {
    label: string;
    iconSource?: ImageSourcePropType;
  }
> = {
  FOOD: {
    label: "음식",
    iconSource: SYSTEM_ICON_IMAGES.food,
  },
  MENU_BOARD: {
    label: "메뉴판",
    iconSource: SYSTEM_ICON_IMAGES.menuboard,
  },
  NUTRITION_LABEL: {
    label: "영양성분표",
    iconSource: SYSTEM_ICON_IMAGES.nutritionlabel,
  },
  GENERAL: {
    label: "일반",
  },
};

function isCameraCaptureMode(value: unknown): value is CameraCaptureMode {
  return typeof value === "string" && CAMERA_CAPTURE_MODES.includes(value as CameraCaptureMode);
}

function getInitialCameraMode(payload?: BridgeCameraCaptureRequestPayload) {
  if (isCameraCaptureMode(payload?.mode)) return payload.mode;

  const firstSelectableMode = payload?.selectableModes?.find(isCameraCaptureMode);
  return firstSelectableMode ?? DEFAULT_CAPTURE_MODE;
}

function getSelectableCameraModes(payload?: BridgeCameraCaptureRequestPayload) {
  const requestedMode = getInitialCameraMode(payload);
  const payloadSelectableModes = payload?.selectableModes ?? [];
  const modes = payloadSelectableModes.length > 0 ? payloadSelectableModes : [requestedMode];
  const uniqueModes = modes.filter(
    (mode, index): mode is CameraCaptureMode =>
      isCameraCaptureMode(mode) && modes.indexOf(mode) === index,
  );

  if (!uniqueModes.includes(requestedMode)) {
    uniqueModes.unshift(requestedMode);
  }

  return uniqueModes.length > 0 ? uniqueModes : [DEFAULT_CAPTURE_MODE];
}

function mapQualityPrioritization(quality?: number): "speed" | "balanced" | "quality" {
  if (quality === undefined) return "balanced";
  if (quality >= 0.9) return "quality";
  if (quality <= 0.4) return "speed";
  return "balanced";
}

function resolvePhotoUri(path: string) {
  return path.startsWith("file://") ? path : `file://${path}`;
}

function resolveFileNameFromUri(uri: string) {
  const sanitized = uri.split("?")[0];
  const segments = sanitized.split("/");
  const fileName = segments[segments.length - 1];
  if (!fileName) return null;
  return fileName;
}

function getPreviewThumbnailMimeType(format: SaveFormat) {
  return format === SaveFormat.WEBP ? "image/webp" : "image/jpeg";
}

function getPreviewThumbnailActions(width: number, height: number): ImageManipulationActions {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    Math.max(width, height) <= PREVIEW_THUMBNAIL_MAX_DIMENSION
  ) {
    return [];
  }

  return width >= height
    ? [{ resize: { width: PREVIEW_THUMBNAIL_MAX_DIMENSION } }]
    : [{ resize: { height: PREVIEW_THUMBNAIL_MAX_DIMENSION } }];
}

async function createPreviewThumbnailWithFormat(
  uri: string,
  width: number,
  height: number,
  format: SaveFormat,
): Promise<PreviewThumbnail | null> {
  const thumbnail = await manipulateAsync(uri, getPreviewThumbnailActions(width, height), {
    base64: true,
    compress: PREVIEW_THUMBNAIL_QUALITY,
    format,
  });

  if (!thumbnail.base64) return null;

  return {
    base64: thumbnail.base64,
    mimeType: getPreviewThumbnailMimeType(format),
  };
}

async function createPreviewThumbnail(uri: string, width: number, height: number) {
  try {
    const thumbnail = await createPreviewThumbnailWithFormat(
      uri,
      width,
      height,
      PREVIEW_THUMBNAIL_PRIMARY_FORMAT,
    );
    if (thumbnail) return thumbnail;
  } catch {
    // Some older devices may fail WebP encoding. JPEG is the stable fallback.
  }

  try {
    return await createPreviewThumbnailWithFormat(
      uri,
      width,
      height,
      PREVIEW_THUMBNAIL_FALLBACK_FORMAT,
    );
  } catch {
    return null;
  }
}

function getCameraOnboardingStorageKey(mode: CameraCaptureMode) {
  return `camera-onboarding-${mode}-done`;
}

async function isCameraOnboardingDone(mode: CameraCaptureMode) {
  try {
    return (
      (await SecureStore.getItemAsync(getCameraOnboardingStorageKey(mode))) ===
      CAMERA_ONBOARDING_DONE_VALUE
    );
  } catch {
    return false;
  }
}

async function markCameraOnboardingDone(mode: CameraCaptureMode) {
  try {
    await SecureStore.setItemAsync(
      getCameraOnboardingStorageKey(mode),
      CAMERA_ONBOARDING_DONE_VALUE,
    );
  } catch {
    // Storage failure should not block camera usage.
  }
}

function LoadingView() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#ff8a00" />
    </View>
  );
}

function CameraProcessingOverlay({ message }: { message: string }) {
  return (
    <View
      style={styles.processingOverlay}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size="large" color="#ff8a00" />
      <Text allowFontScaling={false} style={styles.processingTitle}>
        {message}
      </Text>
      <Text allowFontScaling={false} style={styles.processingDescription}>
        조금만 기다려주세요
      </Text>
    </View>
  );
}

function CameraOnboardingOverlay({
  config,
  onClose,
  onSkip,
}: {
  config: CameraOnboardingConfig;
  onClose: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.cameraOnboardingOverlay} pointerEvents="box-none">
      <View style={styles.cameraOnboardingBackdrop} pointerEvents="none" />

      <View style={styles.cameraOnboardingCenter}>
        <View style={styles.cameraOnboardingCard}>
          <View style={styles.cameraOnboardingContent}>
            <View style={styles.cameraOnboardingVisual}>
              <Image
                source={config.image}
                style={styles.cameraOnboardingImage}
                resizeMode="cover"
              />
              <View style={styles.cameraOnboardingVisualFrame} pointerEvents="none">
                <View style={[styles.cameraOnboardingVisualCorner, styles.visualCornerTopLeft]} />
                <View style={[styles.cameraOnboardingVisualCorner, styles.visualCornerTopRight]} />
                <View
                  style={[styles.cameraOnboardingVisualCorner, styles.visualCornerBottomLeft]}
                />
                <View
                  style={[styles.cameraOnboardingVisualCorner, styles.visualCornerBottomRight]}
                />
              </View>
            </View>

            <Text allowFontScaling={false} style={styles.cameraOnboardingTitle}>
              {config.title}
            </Text>
            <Text allowFontScaling={false} style={styles.cameraOnboardingDescription}>
              {config.description}
            </Text>
          </View>

          <View style={styles.cameraOnboardingActions}>
            <Pressable
              style={({ pressed }) => [
                styles.cameraOnboardingPrimaryButton,
                pressed && styles.pressedButton,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="카메라 안내 닫기"
            >
              <Text allowFontScaling={false} style={styles.cameraOnboardingPrimaryButtonText}>
                닫기
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.cameraOnboardingSkipButton,
                pressed && styles.pressedButton,
              ]}
              onPress={onSkip}
              accessibilityRole="button"
              accessibilityLabel="카메라 안내 다시 보지 않기"
            >
              <Text allowFontScaling={false} style={styles.cameraOnboardingSkipButtonText}>
                다시 보지 않기
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CameraCaptureScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const cameraRef = useRef<Camera>(null);
  const isProcessingRef = useRef(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [cameraPermissionStatus, setCameraPermissionStatus] =
    useState<CameraPermissionStatus | null>(null);
  const [isDeviceDetectionFinished, setIsDeviceDetectionFinished] = useState(false);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isResolvingCapturedPhoto, setIsResolvingCapturedPhoto] = useState(false);
  const [isPickingGallery, setIsPickingGallery] = useState(false);
  const isProcessing = isCapturing || isPickingGallery;
  const processingMessage = isPickingGallery
    ? "사진을 불러오는 중이에요"
    : "촬영한 사진을 준비하고 있어요";
  const capturePayload = useMemo(() => getPendingCameraCapturePayload(), []);
  const selectableCameraModes = useMemo(
    () => getSelectableCameraModes(capturePayload),
    [capturePayload],
  );
  const [captureMode, setCaptureMode] = useState<CameraCaptureMode>(
    () => selectableCameraModes[0] ?? DEFAULT_CAPTURE_MODE,
  );
  const shouldShowModeSelector = selectableCameraModes.length > 1;
  const cameraOnboardingConfig = useMemo(
    () => CAMERA_ONBOARDING_CONFIG[captureMode] ?? null,
    [captureMode],
  );
  const [isCameraOnboardingVisible, setIsCameraOnboardingVisible] = useState(false);
  const [isCameraOnboardingResolved, setIsCameraOnboardingResolved] = useState(false);
  const photoQualityBalance = useMemo(
    () => mapQualityPrioritization(capturePayload?.quality),
    [capturePayload?.quality],
  );
  const device = useCameraDevice("back");

  useEffect(() => {
    setIsCameraInitialized(false);
  }, [device?.id]);

  const getCameraPermissionStatus = useCallback(async (shouldRequestPermission: boolean) => {
    const currentStatus = await Camera.getCameraPermissionStatus();
    if (!shouldRequestPermission || currentStatus === "granted") {
      return currentStatus;
    }

    return await Camera.requestCameraPermission();
  }, []);

  const closeWithCancellation = useCallback(() => {
    rejectCameraCaptureSession(
      new BridgeHandledError("촬영이 취소되었어요.", 499, "CAMERA_CAPTURE_CANCELLED"),
    );
    router.back();
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        if (!hasPendingCameraCaptureSession()) {
          router.back();
          return;
        }

        const nextStatus = await getCameraPermissionStatus(true);

        if (!isMounted) return;

        setCameraPermissionStatus(nextStatus);
        setIsPreparing(false);
      } catch {
        if (!isMounted) return;
        rejectCameraCaptureSession(
          new BridgeHandledError("카메라를 준비하지 못했어요.", 500, "CAMERA_PREPARE_FAILED"),
        );
        router.back();
      }
    })();

    return () => {
      isMounted = false;

      if (!hasPendingCameraCaptureSession()) return;

      rejectCameraCaptureSession(
        new BridgeHandledError("촬영이 취소되었어요.", 499, "CAMERA_CAPTURE_CANCELLED"),
      );
    };
  }, [getCameraPermissionStatus]);

  useEffect(() => {
    if (!isFocused) return;
    if (cameraPermissionStatus === null || cameraPermissionStatus === "granted") return;

    let isMounted = true;

    (async () => {
      try {
        const nextStatus = await getCameraPermissionStatus(false);
        if (!isMounted) return;
        setCameraPermissionStatus(nextStatus);
      } catch {
        // Ignore background re-check failures. User can retry manually.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [cameraPermissionStatus, getCameraPermissionStatus, isFocused]);

  useEffect(() => {
    let isMounted = true;

    if (cameraPermissionStatus !== "granted" || !cameraOnboardingConfig) {
      setIsCameraOnboardingVisible(false);
      setIsCameraOnboardingResolved(true);
      return () => {
        isMounted = false;
      };
    }

    setIsCameraOnboardingResolved(false);

    (async () => {
      const isDone = await isCameraOnboardingDone(captureMode);
      if (!isMounted) return;

      setIsCameraOnboardingVisible(!isDone);
      setIsCameraOnboardingResolved(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [cameraOnboardingConfig, cameraPermissionStatus, captureMode]);

  useEffect(() => {
    if (isPreparing || cameraPermissionStatus !== "granted") {
      setIsDeviceDetectionFinished(false);
      return;
    }

    if (device) {
      setIsDeviceDetectionFinished(true);
      return;
    }

    setIsDeviceDetectionFinished(false);
    const timeoutId = setTimeout(() => {
      setIsDeviceDetectionFinished(true);
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cameraPermissionStatus, device, isPreparing]);

  useEffect(() => {
    if (isPreparing || cameraPermissionStatus !== "granted" || device || !isDeviceDetectionFinished)
      return;

    rejectCameraCaptureSession(
      new BridgeHandledError(
        "사용 가능한 카메라를 찾지 못했어요.",
        500,
        "CAMERA_DEVICE_UNAVAILABLE",
      ),
    );
    router.back();
  }, [cameraPermissionStatus, device, isDeviceDetectionFinished, isPreparing]);

  const handleOpenSettingsPress = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert("설정을 열지 못했어요.", "기기 설정에서 카메라 권한을 직접 허용해주세요.");
    }
  }, []);

  const handleCameraOnboardingClose = useCallback(() => {
    setIsCameraOnboardingVisible(false);
  }, []);

  const handleCameraOnboardingSkip = useCallback(() => {
    setIsCameraOnboardingVisible(false);
    void markCameraOnboardingDone(captureMode);
  }, [captureMode]);

  const handleModePress = useCallback((nextMode: CameraCaptureMode) => {
    if (isProcessingRef.current) return;

    setCaptureMode(nextMode);
  }, []);

  const handleCapturePress = useCallback(async () => {
    if (
      !cameraRef.current ||
      isProcessing ||
      isProcessingRef.current ||
      !isCameraInitialized ||
      !isFocused
    )
      return;

    isProcessingRef.current = true;
    setIsCapturing(true);
    setIsResolvingCapturedPhoto(false);

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: "off",
      });
      setIsResolvingCapturedPhoto(true);

      const uri = resolvePhotoUri(photo.path);
      const previewThumbnail = await createPreviewThumbnail(uri, photo.width, photo.height);

      resolveCameraCaptureSession({
        uri,
        width: photo.width,
        height: photo.height,
        fileName: resolveFileNameFromUri(uri),
        fileSize: null,
        mimeType: "image/jpeg",
        base64: null,
        previewBase64: previewThumbnail?.base64 ?? null,
        previewMimeType: previewThumbnail?.mimeType ?? null,
        mode: captureMode,
      });

      router.back();
    } catch (error) {
      const nativeMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : "unknown";
      console.warn("[CameraCapture] takePhoto failed", error);
      rejectCameraCaptureSession(
        new BridgeHandledError(
          `촬영 결과를 가져오지 못했어요. (${nativeMessage})`,
          500,
          "CAMERA_CAPTURE_FAILED",
        ),
      );
      router.back();
    } finally {
      isProcessingRef.current = false;
      setIsResolvingCapturedPhoto(false);
      setIsCapturing(false);
    }
  }, [captureMode, isCameraInitialized, isFocused, isProcessing]);

  const handleGalleryPress = useCallback(async () => {
    if (isProcessing || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsPickingGallery(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          Alert.alert(
            "갤러리 접근 권한이 꺼져 있어요.",
            "설정에서 사진 접근 권한을 허용한 뒤 다시 시도해주세요.",
            [
              {
                text: "취소",
                style: "cancel",
              },
              {
                text: "설정으로 이동",
                onPress: () => {
                  void handleOpenSettingsPress();
                },
              },
            ],
          );
          return;
        }

        Alert.alert("갤러리 접근 권한이 필요해요.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        quality: capturePayload?.quality ?? 1,
        allowsEditing: false,
        allowsMultipleSelection: false,
        exif: false,
        base64: false,
        mediaTypes: "images",
      });

      if (result.canceled) {
        return;
      }

      if (result.assets.length !== 1) {
        rejectCameraCaptureSession(
          new BridgeHandledError("이미지는 1장만 첨부할 수 있어요.", 400, "IMAGE_COUNT_EXCEEDED"),
        );
        router.back();
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        rejectCameraCaptureSession(
          new BridgeHandledError("선택한 사진을 가져오지 못했어요.", 500, "GALLERY_PICK_FAILED"),
        );
        router.back();
        return;
      }
      const previewThumbnail = await createPreviewThumbnail(asset.uri, asset.width, asset.height);

      resolveCameraCaptureSession({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        base64: null,
        previewBase64: previewThumbnail?.base64 ?? null,
        previewMimeType: previewThumbnail?.mimeType ?? null,
        mode: captureMode,
      });
      router.back();
    } catch {
      rejectCameraCaptureSession(
        new BridgeHandledError(
          "갤러리에서 사진을 불러오지 못했어요.",
          500,
          "GALLERY_ACCESS_FAILED",
        ),
      );
      router.back();
    } finally {
      isProcessingRef.current = false;
      setIsPickingGallery(false);
    }
  }, [captureMode, capturePayload?.quality, handleOpenSettingsPress, isProcessing]);

  const isCameraOnboardingPending =
    cameraPermissionStatus === "granted" &&
    cameraOnboardingConfig !== null &&
    !isCameraOnboardingResolved;
  const isModeSelectorDisabled =
    isProcessing || isCameraOnboardingVisible || isCameraOnboardingPending;
  const isGalleryDisabled = isProcessing || isCameraOnboardingVisible || isCameraOnboardingPending;
  const isCaptureDisabled = isGalleryDisabled || !isFocused || !isCameraInitialized;
  const shouldShowGuideFrame =
    captureMode !== "GENERAL" && !isCameraOnboardingVisible && !isCameraOnboardingPending;
  const cameraTopBarHeight = insets.top + CAMERA_TOP_BAR_CONTENT_HEIGHT;
  const bottomInset = Math.max(insets.bottom, 18);
  const cameraBottomBarMinHeight = CAMERA_BOTTOM_BAR_CONTENT_HEIGHT + bottomInset;

  if (isPreparing) {
    return <LoadingView />;
  }

  if (cameraPermissionStatus !== "granted") {
    return (
      <View style={styles.permissionScreen}>
        <StatusBar style="light" />
        <View
          style={[styles.permissionTopBar, { height: cameraTopBarHeight, paddingTop: insets.top }]}
        >
          <Pressable
            style={styles.cameraCloseButton}
            onPress={closeWithCancellation}
            accessibilityRole="button"
            accessibilityLabel="카메라 닫기"
          >
            <Image
              source={SYSTEM_ICON_IMAGES.close}
              style={styles.cameraCloseIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        <View style={styles.permissionCard}>
          <Image
            source={SYSTEM_ICON_IMAGES.gallery}
            style={styles.permissionIcon}
            resizeMode="contain"
          />
          <Text allowFontScaling={false} style={styles.permissionTitle}>
            카메라 권한이 꺼져 있어요.
          </Text>
          <Text allowFontScaling={false} style={styles.permissionDescription}>
            기기 설정에서 카메라 접근을 허용한 뒤{"\n"} 다시 시도해주세요.
          </Text>

          <Pressable
            style={styles.permissionPrimaryButton}
            onPress={handleOpenSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="설정으로 이동"
          >
            <Text allowFontScaling={false} style={styles.permissionPrimaryButtonText}>
              설정으로 이동
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!device) {
    return <LoadingView />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && !isPickingGallery && !isResolvingCapturedPhoto}
        photo={true}
        audio={false}
        photoQualityBalance={photoQualityBalance}
        onInitialized={() => {
          setIsCameraInitialized(true);
        }}
      />

      <View style={styles.cameraOverlay} pointerEvents="box-none">
        <View style={[styles.cameraTopBar, { height: cameraTopBarHeight, paddingTop: insets.top }]}>
          <Pressable
            style={styles.cameraCloseButton}
            onPress={closeWithCancellation}
            accessibilityRole="button"
            accessibilityLabel="카메라 닫기"
          >
            <Image
              source={SYSTEM_ICON_IMAGES.close}
              style={styles.cameraCloseIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        <View style={styles.cameraGuideArea} pointerEvents="none">
          {shouldShowGuideFrame ? (
            <View style={styles.cameraGuideFrame}>
              <View style={[styles.cameraGuideCorner, styles.guideCornerTopLeft]} />
              <View style={[styles.cameraGuideCorner, styles.guideCornerTopRight]} />
              <View style={[styles.cameraGuideCorner, styles.guideCornerBottomLeft]} />
              <View style={[styles.cameraGuideCorner, styles.guideCornerBottomRight]} />
            </View>
          ) : null}
        </View>

        {shouldShowModeSelector ? (
          <View style={styles.cameraModeSection}>
            <View style={styles.cameraModeList}>
              {selectableCameraModes.map((mode) => {
                const selectorConfig = CAMERA_MODE_SELECTOR_CONFIG[mode];

                const isSelected = mode === captureMode;

                return (
                  <Pressable
                    key={mode}
                    style={[
                      styles.cameraModeButton,
                      isSelected && styles.cameraModeButtonSelected,
                      isModeSelectorDisabled && styles.disabledControl,
                    ]}
                    onPress={() => {
                      handleModePress(mode);
                    }}
                    disabled={isModeSelectorDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={`${selectorConfig.label} 모드`}
                    accessibilityState={{
                      selected: isSelected,
                      disabled: isModeSelectorDisabled,
                    }}
                  >
                    {selectorConfig.iconSource ? (
                      <Image
                        source={selectorConfig.iconSource}
                        style={styles.cameraModeIcon}
                        resizeMode="contain"
                      />
                    ) : null}
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.cameraModeButtonText,
                        isSelected && styles.cameraModeButtonTextSelected,
                      ]}
                    >
                      {selectorConfig.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.cameraBottomBar,
            {
              minHeight: cameraBottomBarMinHeight,
              paddingBottom: bottomInset,
            },
          ]}
        >
          <View style={styles.cameraCaptureControls}>
            <Pressable
              style={[
                styles.cameraControlSideSlot,
                styles.galleryButton,
                isGalleryDisabled && styles.disabledControl,
              ]}
              onPress={handleGalleryPress}
              disabled={isGalleryDisabled}
              accessibilityRole="button"
              accessibilityLabel="갤러리에서 사진 선택"
            >
              <Image
                source={SYSTEM_ICON_IMAGES.gallery}
                style={styles.galleryIcon}
                resizeMode="contain"
              />
            </Pressable>
            <Pressable
              style={[styles.cameraShutterButton, isCaptureDisabled && styles.disabledControl]}
              onPress={handleCapturePress}
              disabled={isCaptureDisabled}
              accessibilityRole="button"
              accessibilityLabel="사진 촬영"
            >
              <View style={styles.cameraShutterButtonInner} />
            </Pressable>
            <View style={styles.cameraControlSideSlot} />
          </View>
        </View>
      </View>

      {isCameraOnboardingVisible && cameraOnboardingConfig ? (
        <CameraOnboardingOverlay
          config={cameraOnboardingConfig}
          onClose={handleCameraOnboardingClose}
          onSkip={handleCameraOnboardingSkip}
        />
      ) : null}

      {isProcessing ? <CameraProcessingOverlay message={processingMessage} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: "#111111",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  permissionTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: "#000000",
    zIndex: 30,
  },
  permissionCard: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  permissionTitle: {
    ...typography["typo-title2"],
    marginTop: 4,
    color: "#141414",
    textAlign: "center",
  },
  permissionDescription: {
    ...typography["typo-body3"],
    color: "#5f5f5f",
    lineHeight: 20,
    textAlign: "center",
  },
  permissionPrimaryButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: "#ff8a00",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    alignSelf: "stretch",
  },
  permissionPrimaryButtonText: {
    ...typography["typo-label2"],
    color: "#ffffff",
  },
  permissionIcon: {
    width: 36,
    height: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    paddingHorizontal: 24,
    zIndex: 60,
  },
  processingTitle: {
    ...typography["typo-title4"],
    color: "#ffffff",
    marginTop: 18,
    textAlign: "center",
  },
  processingDescription: {
    ...typography["typo-body3"],
    color: "rgba(255, 255, 255, 0.72)",
    marginTop: 6,
    textAlign: "center",
  },
  cameraOverlay: {
    flex: 1,
  },
  cameraTopBar: {
    paddingHorizontal: 20,
    backgroundColor: "#000000",
  },
  cameraCloseButton: {
    width: CAMERA_TOP_BAR_CONTENT_HEIGHT,
    height: CAMERA_TOP_BAR_CONTENT_HEIGHT,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: "auto",
  },
  cameraCloseIcon: {
    width: 24,
    height: 24,
  },
  cameraGuideArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  cameraGuideFrame: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  cameraGuideCorner: {
    position: "absolute",
    width: 52,
    height: 65,
    borderColor: "#ffffff",
  },
  guideCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 20,
  },
  guideCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 20,
  },
  guideCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 20,
  },
  guideCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 20,
  },
  cameraBottomBar: {
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 27,
    paddingTop: 16,
  },
  cameraModeSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  cameraModeList: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  cameraModeButton: {
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 8,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    opacity: 0.3,
  },
  cameraModeButtonSelected: {
    backgroundColor: "#ffffff",
    borderColor: "#bfbfbf",
    borderWidth: 1,
    opacity: 1,
  },
  cameraModeIcon: {
    width: 26,
    height: 26,
  },
  cameraModeButtonText: {
    ...typography["typo-body3"],
    color: "#ffffff",
    textAlign: "center",
  },
  cameraModeButtonTextSelected: {
    color: "#1f1f1f",
  },
  cameraCaptureControls: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cameraControlSideSlot: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryButton: {
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
  galleryIcon: {
    width: 24,
    height: 24,
  },
  cameraShutterButton: {
    width: 60,
    height: 60,
    borderRadius: 100,
    borderWidth: 7,
    borderColor: "#ff8a00",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  cameraShutterButtonInner: {
    width: 46,
    height: 46,
    borderRadius: 100,
    backgroundColor: "#ffffff",
  },
  disabledControl: {
    opacity: 0.6,
  },
  cameraOnboardingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 88,
    paddingBottom: 136,
    zIndex: 40,
  },
  cameraOnboardingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  cameraOnboardingCenter: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraOnboardingCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  cameraOnboardingContent: {
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 30,
  },
  cameraOnboardingVisual: {
    width: 250,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  cameraOnboardingImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  cameraOnboardingVisualFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOnboardingVisualCorner: {
    position: "absolute",
    width: 68,
    height: 68,
    borderColor: "#ff8000",
  },
  visualCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderTopLeftRadius: 30,
  },
  visualCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderTopRightRadius: 30,
  },
  visualCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderBottomLeftRadius: 30,
  },
  visualCornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderBottomRightRadius: 30,
  },
  cameraOnboardingTitle: {
    ...typography["typo-title2"],
    color: "#1f1f1f",
    textAlign: "center",
    marginTop: 28,
  },
  cameraOnboardingDescription: {
    ...typography["typo-body2"],
    color: "#1f1f1f",
    textAlign: "center",
    marginTop: 8,
  },
  cameraOnboardingActions: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 30,
    paddingVertical: 24,
  },
  cameraOnboardingPrimaryButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#ff8a00",
    borderRadius: 6,
    height: 42,
    justifyContent: "center",
  },
  cameraOnboardingPrimaryButtonText: {
    ...typography["typo-label1"],
    color: "#ffffff",
  },
  cameraOnboardingSkipButton: {
    marginTop: 12,
  },
  cameraOnboardingSkipButtonText: {
    ...typography["typo-label3"],
    color: "#8d8d8d",
  },
  pressedButton: {
    opacity: 0.78,
  },
});
