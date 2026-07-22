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
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  useMenuSelectionFlowById,
} from "@/features/menu-selection-flow/stores/menuSelectionFlow.store";
import {
  getMenuSelectionFlowIdFromSearchParams,
  getMenuSelectionFlowPath,
} from "@/features/menu-selection-flow/utils/menuSelectionFlowRoutes";
import { PATH } from "@/router/path";
import { getPathWithMeal } from "@/router/pathHelpers";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
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
  brand?: string;
  name?: string;
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
  const menuSelectionFlowId = getMenuSelectionFlowIdFromSearchParams(searchParams);
  const menuSelectionFlow = useMenuSelectionFlowById(menuSelectionFlowId);
  const dateKey = getSafeDateKey(
    searchParams.get("date") ?? menuSelectionFlow?.relatedMealRecordDateKey ?? null,
  );
  const mealType = getMealType(
    searchParams.get("mealType") ?? menuSelectionFlow?.relatedMealRecordMealType ?? null,
  );
  const foodName = searchParams.get("name") ?? locationState.name ?? "";
  const brandName = searchParams.get("brand") ?? locationState.brand ?? "";
  const autoTriggeredRef = useRef(false);

  const returnFromCameraPage = useCallback(() => {
    const nutrientAddFallbackPath = menuSelectionFlowId
      ? getMenuSelectionFlowPath({
          path: PATH.NUTRIENT_ADD,
          menuSelectionFlowId,
          extraSearchParams: {
            name: foodName,
            brand: brandName,
          },
        })
      : getPathWithMeal(PATH.NUTRIENT_ADD, dateKey, mealType);

    navigateBack({
      fallbackTo: nutrientAddFallbackPath,
      fallbackOptions: {
        state: {
          name: foodName,
          brand: brandName,
        },
      },
    });
  }, [
    brandName,
    dateKey,
    foodName,
    mealType,
    menuSelectionFlowId,
  ]);

  const handleCameraActions = useCallback(async () => {
    if (isUploading) return;
    setCaptureErrorFeedback(null);

    let capturedImage: Awaited<ReturnType<typeof requestNativeCameraCapture>>;
    try {
      setIsOpeningCamera(true);
      capturedImage = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "NUTRITION_LABEL",
      });
      setIsOpeningCamera(false);
    } catch (error) {
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
      const registerPath = menuSelectionFlowId
        ? getMenuSelectionFlowPath({
            path: PATH.NUTRIENT_ADD_REGISTER,
            menuSelectionFlowId,
          })
        : getPathWithMeal(PATH.NUTRIENT_ADD_REGISTER, dateKey, mealType);
      navigation(registerPath, {
        replace: true,
        animate: false,
        state: {
          ...imageData, // unit, weight, calories, carbs...
          name: foodName,
          brand: brandName,
          entrySource: "camera" as const,
          dateKey,
          mealType,
        },
      });

      toast.success("영양성분표 분석이 완료되었어요.");
    } catch (error) {
      setCapturedPreviewSrc(null);
      setCaptureErrorFeedback(getRecognitionErrorFeedback("NUTRITION_LABEL", error));
    } finally {
      setIsUploading(false);
    }
  }, [
    dateKey,
    foodName,
    brandName,
    isUploading,
    mealType,
    menuSelectionFlowId,
    navigation,
    returnFromCameraPage,
    uploadImage,
  ]);

  useEffect(() => {
    if (autoTriggeredRef.current) return;

    autoTriggeredRef.current = true;
    void handleCameraActions();
  }, [handleCameraActions]);

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
