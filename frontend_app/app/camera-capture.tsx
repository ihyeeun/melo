import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
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
import type { BridgeCameraCaptureRequestPayload } from "@/src/shared/api/bridge/bridge.types";
import { typography } from "@/src/shared/styles/tokens";

type CameraCaptureMode = NonNullable<BridgeCameraCaptureRequestPayload["mode"]>;
type CameraPermissionStatus = Awaited<ReturnType<typeof Camera.getCameraPermissionStatus>>;

const DEFAULT_CAPTURE_MODE: CameraCaptureMode = "NUTRITION_LABEL";
const CAMERA_ONBOARDING_DONE_VALUE = "done";

const CAMERA_MODE_CONFIG: Record<
  CameraCaptureMode,
  {
    guideText: string | null;
    showGalleryButton: boolean;
    frameAspectRatio: number | null;
  }
> = {
  NUTRITION_LABEL: {
    guideText: "영양성분표가 선명하게 보이도록 촬영해주세요",
    showGalleryButton: true,
    frameAspectRatio: 0.68,
  },
  MENU_BOARD: {
    guideText: "메뉴판을 화면에 맞춰주세요",
    showGalleryButton: true,
    frameAspectRatio: 0.68,
  },
  FOOD: {
    guideText: "음식이 프레임 안에 잘 보이도록 촬영해주세요",
    showGalleryButton: true,
    frameAspectRatio: 0.68,
  },
  GENERAL: {
    guideText: null,
    showGalleryButton: true,
    frameAspectRatio: null,
  },
};

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

async function readBase64FromUri(uri: string) {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
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
  const [isPickingGallery, setIsPickingGallery] = useState(false);
  const isProcessing = isCapturing || isPickingGallery;
  const capturePayload = useMemo(() => getPendingCameraCapturePayload(), []);
  const captureMode = useMemo<CameraCaptureMode>(
    () => capturePayload?.mode ?? DEFAULT_CAPTURE_MODE,
    [capturePayload?.mode],
  );
  const cameraModeConfig = useMemo(() => CAMERA_MODE_CONFIG[captureMode], [captureMode]);
  const cameraOnboardingConfig = useMemo(
    () => CAMERA_ONBOARDING_CONFIG[captureMode] ?? null,
    [captureMode],
  );
  const shouldShowOverlay = useMemo(
    () => cameraModeConfig.guideText !== null || cameraModeConfig.frameAspectRatio !== null,
    [cameraModeConfig.frameAspectRatio, cameraModeConfig.guideText],
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

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: "off",
      });
      const uri = resolvePhotoUri(photo.path);
      const base64 = await readBase64FromUri(uri);

      resolveCameraCaptureSession({
        uri,
        width: photo.width,
        height: photo.height,
        fileName: resolveFileNameFromUri(uri),
        fileSize: null,
        mimeType: "image/jpeg",
        base64,
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
      setIsCapturing(false);
    }
  }, [isCameraInitialized, isFocused, isProcessing]);

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
      const base64 = asset.base64 ?? (await readBase64FromUri(asset.uri));

      resolveCameraCaptureSession({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        base64,
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
  }, [capturePayload?.quality, handleOpenSettingsPress, isProcessing]);

  const isCameraOnboardingPending =
    cameraPermissionStatus === "granted" &&
    cameraOnboardingConfig !== null &&
    !isCameraOnboardingResolved;
  const isGalleryDisabled = isProcessing || isCameraOnboardingVisible || isCameraOnboardingPending;
  const isCaptureDisabled = isGalleryDisabled || !isFocused || !isCameraInitialized;
  const shouldShowGuideOverlay =
    shouldShowOverlay && !isCameraOnboardingVisible && !isCameraOnboardingPending;

  if (isPreparing) {
    return <LoadingView />;
  }

  if (cameraPermissionStatus !== "granted") {
    return (
      <View style={styles.permissionContainer}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.spacer} />
          <Pressable
            style={styles.closeButton}
            onPress={closeWithCancellation}
            accessibilityRole="button"
            accessibilityLabel="카메라 닫기"
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={36} color="#ff8a00" />
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
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && !isPickingGallery}
        photo={true}
        audio={false}
        photoQualityBalance={photoQualityBalance}
        onInitialized={() => {
          setIsCameraInitialized(true);
        }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.spacer} />
        <Pressable
          style={styles.closeButton}
          onPress={closeWithCancellation}
          accessibilityRole="button"
          accessibilityLabel="카메라 닫기"
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </Pressable>
      </View>

      {shouldShowGuideOverlay ? (
        <View style={styles.overlay}>
          {cameraModeConfig.guideText ? (
            <View style={styles.guideCard}>
              <Text allowFontScaling={false} style={styles.guideText}>
                {cameraModeConfig.guideText}
              </Text>
            </View>
          ) : null}
          {cameraModeConfig.frameAspectRatio ? (
            <View style={[styles.frameBox, { aspectRatio: cameraModeConfig.frameAspectRatio }]}>
              <View style={[styles.frameCorner, styles.cornerTopLeft]} />
              <View style={[styles.frameCorner, styles.cornerTopRight]} />
              <View style={[styles.frameCorner, styles.cornerBottomLeft]} />
              <View style={[styles.frameCorner, styles.cornerBottomRight]} />
            </View>
          ) : null}
        </View>
      ) : null}

      {isCameraOnboardingVisible && cameraOnboardingConfig ? (
        <CameraOnboardingOverlay
          config={cameraOnboardingConfig}
          onClose={handleCameraOnboardingClose}
          onSkip={handleCameraOnboardingSkip}
        />
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {cameraModeConfig.showGalleryButton ? (
          <Pressable
            style={[
              styles.sideSlot,
              styles.galleryButton,
              isGalleryDisabled && styles.disabledButton,
            ]}
            onPress={handleGalleryPress}
            disabled={isGalleryDisabled}
            accessibilityRole="button"
            accessibilityLabel="갤러리에서 사진 선택"
          >
            <Ionicons name="images-outline" size={24} color="#ffffff" />
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}
        <Pressable
          style={[styles.captureOuter, isCaptureDisabled && styles.disabledButton]}
          onPress={handleCapturePress}
          disabled={isCaptureDisabled}
          accessibilityRole="button"
          accessibilityLabel="사진 촬영"
        >
          <View style={styles.captureInner} />
        </Pressable>
        <View style={styles.sideSlot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#111111",
    justifyContent: "center",
    paddingHorizontal: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    backgroundColor: "black",
    zIndex: 30,
  },
  spacer: {
    width: 28,
    height: 58,
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
    marginBottom: 30,
    zIndex: 10,
  },
  guideCard: {
    marginBottom: 20,
    backgroundColor: "#ffe9d5",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  guideText: {
    ...typography["typo-label4"],
    color: "#000",
  },
  frameBox: {
    width: "82%",
    position: "relative",
  },
  frameCorner: {
    position: "absolute",
    width: 58,
    height: 58,
    borderColor: "#ffffff",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.86)",
    padding: 27,
    zIndex: 30,
  },
  sideSlot: {
    width: 44,
    height: 44,
  },
  galleryButton: {
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 9,
    borderColor: "#ff8a00",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 30,
    backgroundColor: "#ffffff",
  },
  disabledButton: {
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
