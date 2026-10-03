import { useActivity } from "@stackflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { useCreateMenuByNutritionLabelImageMutation } from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
import styles from "@/features/camera/styles/CameraPage.module.css";
import {
  type CameraCaptureErrorFeedback,
  DEFAULT_CAMERA_CAPTURE_QUALITY,
  getCameraCaptureErrorFeedback,
  getCapturedImagePreviewSrc,
  getRecognitionErrorFeedback,
  isCameraCaptureCancelled,
} from "@/features/camera/utils/cameraCapture";
import {
  getMealType,
  getSafeDateKey,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  buildMenuSelectionPathContext,
  getMenuSelectionPath,
  getMenuSelectionRouteContextFromSearchParams,
  getMenuSelectionSearchPath,
  type MenuSelectionPathParams,
} from "@/features/menu-selection/utils/menuSelectionRoutes";
import { PATH } from "@/router/path";
import { getMealSearchPath, getPathWithMeal } from "@/router/pathHelpers";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { captureScreenRequestScope } from "@/shared/api/screenRequests";
import type { MealType } from "@/shared/api/types/api.dto";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

type NutritionLabelCreateLocationState = {
  dateKey?: string;
  mealType?: MealType;
};

export default function NutrientCameraPage() {
  const navigation = useNavigate();
  const location = useLocation();
  const [isOpeningCamera, setIsOpeningCamera] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedPreviewSrc, setCapturedPreviewSrc] = useState<string | null>(null);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const { mutateAsync: uploadImage } = useCreateMenuByNutritionLabelImageMutation();
  const [searchParams] = useSearchParams();
  const locationState = useMemo(
    () => (location.state ?? {}) as NutritionLabelCreateLocationState,
    [location.state],
  );
  const menuSelectionRouteContext = useMemo(
    () => getMenuSelectionRouteContextFromSearchParams(searchParams),
    [searchParams],
  );
  const dateKey = getSafeDateKey(
    searchParams.get("date") ?? locationState.dateKey ?? null,
  );
  const mealType = getMealType(searchParams.get("mealType") ?? locationState.mealType ?? null);
  const menuSelectionContext = useMemo<MenuSelectionPathParams | null>(
    () =>
      menuSelectionRouteContext.target
        ? buildMenuSelectionPathContext({
            dateKey,
            mealType,
            routeContext: menuSelectionRouteContext,
            target: menuSelectionRouteContext.target,
          })
        : null,
    [dateKey, mealType, menuSelectionRouteContext],
  );
  const { id: screenId, isActive: isScreenActive } = useActivity();
  const autoTriggeredRef = useRef(false);

  const returnFromCameraPage = useCallback(() => {
    navigateBack({
      fallbackTo: menuSelectionContext?.target
        ? getMenuSelectionSearchPath(menuSelectionContext)
        : getMealSearchPath(dateKey, mealType),
    });
  }, [dateKey, mealType, menuSelectionContext]);

  const handleCameraActions = useCallback(async () => {
    if (isUploading) return;
    const screen = captureScreenRequestScope(screenId);
    if (!screen.isActive()) return;
    autoTriggeredRef.current = true;
    setCaptureErrorFeedback(null);

    let capturedImage: Awaited<ReturnType<typeof requestNativeCameraCapture>>;
    try {
      setIsOpeningCamera(true);
      capturedImage = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "NUTRITION_LABEL",
      });
      screen.assertActive();
      setIsOpeningCamera(false);
    } catch (error) {
      if (!screen.isActive()) return;
      setIsOpeningCamera(false);
      if (isCameraCaptureCancelled(error)) {
        returnFromCameraPage();
        return;
      }
      setCapturedPreviewSrc(null);
      setCaptureErrorFeedback(getCameraCaptureErrorFeedback(error));
      return;
    }

    try {
      setCapturedPreviewSrc(getCapturedImagePreviewSrc(capturedImage));
      setIsUploading(true);
      const imageData = await uploadImage(capturedImage);
      screen.assertActive();
      const registerPath = menuSelectionContext?.target
        ? getMenuSelectionPath({
            path: PATH.NUTRIENT_ADD_REGISTER,
            ...menuSelectionContext,
          })
        : getPathWithMeal(PATH.NUTRIENT_ADD_REGISTER, dateKey, mealType);
      navigation(registerPath, {
        replace: true,
        animate: false,
        state: {
          ...imageData, // unit, weight, calories, carbs...
          name: "",
          brand: "",
          entrySource: "camera" as const,
          dateKey,
          mealType,
        },
      });

      toast.success("영양성분표 분석이 완료되었어요.");
    } catch (error) {
      if (!screen.isActive()) return;
      setCapturedPreviewSrc(null);
      setCaptureErrorFeedback(getRecognitionErrorFeedback("NUTRITION_LABEL", error));
    } finally {
      setIsUploading(false);
    }
  }, [
    dateKey,
    isUploading,
    mealType,
    menuSelectionContext,
    navigation,
    returnFromCameraPage,
    uploadImage,
    screenId,
  ]);

  useEffect(() => {
    if (!isScreenActive) {
      autoTriggeredRef.current = false;
      return;
    }
    if (autoTriggeredRef.current) return;

    void handleCameraActions();
  }, [handleCameraActions, isScreenActive]);

  const handleCaptureErrorModalOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;

      setCaptureErrorFeedback(null);
      window.setTimeout(() => {
        void handleCameraActions();
      }, 0);
    },
    [handleCameraActions],
  );

  return (
    <section className={styles.page}>
      <PageHeader title="영양정보 촬영" onBack={returnFromCameraPage} />

      {isOpeningCamera ? (
        <main className={styles.main} />
      ) : isUploading ? (
        <CameraLoading description="영양 성분을 확인하고 있어요" previewSrc={capturedPreviewSrc} />
      ) : (
        <main className={styles.main} />
      )}

      <CheckButtonModal
        open={captureErrorFeedback !== null}
        onOpenChange={handleCaptureErrorModalOpenChange}
        title={captureErrorFeedback?.title ?? ""}
        description={captureErrorFeedback?.description}
      />
    </section>
  );
}
