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
import { PATH } from "@/router/path";
import {
  getMealRecordPath,
  getPathWithMealMode,
  type PersonalMenuEditMode,
} from "@/router/pathHelpers";
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
  afterAddReturnPath?: string;
  backReturnPath?: string;
  brand?: string;
  keyword?: string;
  mode?: PersonalMenuEditMode;
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
  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const editMode = getPersonalMenuEditMode(searchParams.get("mode") ?? locationState.mode ?? null);
  const searchKeyword = searchParams.get("keyword")?.trim() || locationState.keyword;
  const foodName = searchParams.get("name") ?? locationState.name ?? "";
  const brandName = searchParams.get("brand") ?? locationState.brand ?? "";
  const autoTriggeredRef = useRef(false);

  const returnFromCameraPage = useCallback(() => {
    navigateBack({
      fallbackTo: getPathWithMealMode(
        PATH.NUTRIENT_ADD,
        dateKey,
        mealType,
        editMode,
        searchKeyword,
      ),
      fallbackOptions: {
        state: {
          ...locationState,
          name: foodName,
          brand: brandName,
          keyword: searchKeyword,
          mode: editMode ?? undefined,
        },
      },
    });
  }, [brandName, dateKey, editMode, foodName, locationState, mealType, searchKeyword]);

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
      const registerPath = getPathWithMealMode(
        PATH.NUTRIENT_ADD_REGISTER,
        dateKey,
        mealType,
        editMode,
        searchKeyword,
      );
      const searchReturnPath = getPathWithMealMode(
        PATH.MEAL_RECORD_ADD_SEARCH,
        dateKey,
        mealType,
        editMode,
        searchKeyword,
      );

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
          keyword: searchKeyword,
          mode: editMode ?? undefined,
          backReturnPath: locationState.backReturnPath ?? searchReturnPath,
          afterAddReturnPath:
            locationState.afterAddReturnPath ??
            (editMode === "folder"
              ? PATH.CREATE_FOLDER
              : editMode === "set"
                ? PATH.CREATE_MENU_SET
                : getMealRecordPath(dateKey, mealType)),
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
    editMode,
    foodName,
    brandName,
    isUploading,
    locationState.afterAddReturnPath,
    locationState.backReturnPath,
    mealType,
    navigation,
    returnFromCameraPage,
    searchKeyword,
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

function getPersonalMenuEditMode(value: string | null): PersonalMenuEditMode | null {
  if (value === "folder" || value === "set") {
    return value;
  }

  return null;
}
