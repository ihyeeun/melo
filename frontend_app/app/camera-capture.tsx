import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ImageSourcePropType,
  Linking,
  Pressable,
  StyleSheet,
  View,
  Image,
} from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import { semantic } from "@/src/shared/styles";
import { LoadingOverlay, Typo } from "@/src/shared/ui";

type CameraCaptureMode = BridgeCameraCaptureMode;
type CameraPermissionStatus = Awaited<ReturnType<typeof Camera.getCameraPermissionStatus>>;

const DEFAULT_CAPTURE_MODE: CameraCaptureMode = "NUTRITION_LABEL";
const CAMERA_ONBOARDING_DONE_VALUE = "done";
const PREVIEW_THUMBNAIL_MAX_DIMENSION = 720;
const PREVIEW_THUMBNAIL_QUALITY = 0.82;
const PREVIEW_THUMBNAIL_PRIMARY_FORMAT = SaveFormat.WEBP;
const PREVIEW_THUMBNAIL_FALLBACK_FORMAT = SaveFormat.JPEG;
const CAMERA_TOP_BAR_CONTENT_HEIGHT = 58;
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
  close: require("@/assets/design-update/system-icons/exit.png"),
  gallery: require("@/assets/design-update/system-icons/gallery.png"),
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
    image: require("@/assets/design-update/camera-label.png"),
  },
  MENU_BOARD: {
    title: "메뉴판이 잘 보이도록 촬영해주세요",
    description: "최대한 정보가 잘 읽히도록\n빛 반사나 왜곡 없이 올려주세요",
    image: require("@/assets/design-update/camera-board.png"),
  },
  FOOD: {
    title: "음식이 잘 보이도록 촬영해주세요",
    description: "화면 프레임 안에 음식이\n들어갈 수 있도록 촬영해주세요",
    image: require("@/assets/design-update/camera-food.png"),
  },
};

const CAMERA_MODE_SELECTOR_CONFIG: Record<
  CameraCaptureMode,
  {
    label: string;
  }
> = {
  FOOD: {
    label: "음식",
  },
  MENU_BOARD: {
    label: "메뉴판",
  },
  NUTRITION_LABEL: {
    label: "영양성분표",
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

      <View style={styles.cameraOnboardingCard}>
        <View style={styles.cameraOnboardingContent}>
          <Typo size="title-s-semi" color="primary" style={styles.textCenter}>
            {config.title}
          </Typo>
          <Typo size="body-m-regular" color="secondary" style={styles.textCenter}>
            {config.description}
          </Typo>
        </View>

        <Image source={config.image} style={styles.cameraOnboardingImage} resizeMode="cover" />

        <View style={styles.cameraOnboardingActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.cameraOnboardingPrimaryButton,
              pressed && styles.pressedButton,
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="카메라 안내 닫기"
          >
            <Typo size="body-m-medium" color="accent">
              닫기
            </Typo>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.cameraOnboardingSkipButton,
              pressed && styles.pressedButton,
            ]}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="카메라 안내 다시 보지 않기"
          >
            <Typo size="body-m-medium" color="tertiary">
              다시 보지 않기
            </Typo>
          </Pressable>
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

  if (isPreparing) {
    return <LoadingOverlay message="카메라 준비 중..." />;
  }

  if (cameraPermissionStatus !== "granted") {
    return (
      <SafeAreaView style={styles.permissionScreen} edges={["bottom"]}>
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

        <View style={styles.cameraOnboardingCard}>
          <Typo size="title-s-semi" color="primary">
            카메라 권한이 꺼져 있어요.
          </Typo>
          <Typo size="body-m-regular" color="secondary" style={styles.textCenter}>
            기기 설정에서 카메라 접근을 허용한 뒤{"\n"} 다시 시도해주세요.
          </Typo>

          <Pressable
            style={[styles.actionButton, styles.cameraOnboardingPrimaryButton]}
            onPress={handleOpenSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="설정으로 이동"
          >
            <Typo size="body-m-semi" color="accent">
              설정으로 이동
            </Typo>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return <LoadingOverlay message="연결 가능한 카메라 찾는 중.." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
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
                    <Typo
                      allowFontScaling={false}
                      color="primary"
                      style={[styles.cameraModeButtonText, !isSelected && styles.colorWhite]}
                      size="body-s-medium"
                    >
                      {selectorConfig.label}
                    </Typo>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.cameraBottomBar}>
          <View style={styles.cameraCaptureControls}>
            <Pressable
              style={[styles.galleryButton, isGalleryDisabled && styles.disabledControl]}
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
              <View style={styles.cameraShutterGlow} pointerEvents="none" />
              <View style={styles.cameraShutterFace} pointerEvents="none" />
            </Pressable>
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

      {isProcessing ? <LoadingOverlay message={processingMessage} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: semantic.background.dark,
    justifyContent: "flex-end",
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  permissionTopBar: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: semantic.background.dark,
    zIndex: 30,
  },
  cameraOverlay: {
    flex: 1,
  },
  cameraTopBar: {
    height: 52,
    backgroundColor: semantic.background.dark,
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
    position: "absolute",
    right: 16,
    bottom: 12,
  },
  cameraGuideArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cameraGuideFrame: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  cameraGuideCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: semantic.background.default,
  },
  guideCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  guideCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  guideCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  guideCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  cameraBottomBar: {
    backgroundColor: semantic.background.dark,
    alignItems: "center",
    justifyContent: "center",
    height: 118,
  },
  cameraModeSection: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 16,
  },
  cameraModeList: {
    flexDirection: "row",
    gap: 4,
    width: 261,
    backgroundColor: semantic.dimmer.default,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cameraModeButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cameraModeButtonSelected: {
    backgroundColor: semantic.btn.default,
  },
  cameraModeIcon: {
    width: 26,
    height: 26,
  },
  cameraModeButtonText: {
    textAlign: "center",
  },
  colorWhite: {
    color: "#fff",
  },
  cameraCaptureControls: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    width: "100%",
  },
  galleryButton: {
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
    position: "absolute",
    left: 56,
  },
  galleryIcon: {
    width: 28,
    height: 28,
  },
  cameraShutterButton: {
    width: 70,
    height: 70,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraShutterGlow: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 100,
    backgroundColor: "rgba(255, 132, 101, 0.3)",
    filter: [{ blur: 4 }],
  },
  cameraShutterFace: {
    width: 58,
    height: 58,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: semantic.btn.default,
    backgroundColor: semantic.background.default,
  },
  disabledControl: {
    opacity: 0.6,
  },
  cameraOnboardingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 40,
  },
  cameraOnboardingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: semantic.dimmer.default,
  },
  cameraOnboardingCard: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.background.default,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 24,
  },
  cameraOnboardingContent: {
    gap: 8,
  },
  textCenter: {
    textAlign: "center",
  },
  cameraOnboardingImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  cameraOnboardingVisualFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOnboardingActions: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  actionButton: {
    width: "100%",
    height: 44,
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraOnboardingPrimaryButton: {
    backgroundColor: semantic.btn.default,
  },
  cameraOnboardingSkipButton: {
    backgroundColor: semantic.background.default,
  },
  pressedButton: {
    opacity: 0.7,
  },
});
