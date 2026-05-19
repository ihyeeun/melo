import { useCallback, useEffect, useRef, useState } from "react";

import styles from "@/features/camera/CameraPage.module.css";
import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { useNutritionLabelMutation } from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
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
import { getPathWithMeal } from "@/router/pathHelpers";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  navigateBackAndPush,
  useLocation,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

type NutrientCameraLocationState = {
  autoOpenCamera?: boolean;
};

export default function NutrientCameraPage() {
  const location = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [capturedPreviewSrc, setCapturedPreviewSrc] = useState<string | null>(null);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const { mutateAsync: uploadImage } = useNutritionLabelMutation();
  const [searchParams] = useSearchParams();
  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const autoTriggeredRef = useRef(false);
  const locationState = (location.state ?? {}) as NutrientCameraLocationState;
  const shouldAutoOpenCamera = locationState.autoOpenCamera === true;
  const [isAutoOpenPending, setIsAutoOpenPending] = useState(shouldAutoOpenCamera);
  const shouldHideWebCameraPrompt =
    isAutoOpenPending && !isUploading && captureErrorFeedback === null;

  const returnFromCameraPage = useCallback(() => {
    navigateBack({
      fallbackTo: getPathWithMeal(
        PATH.NUTRIENT_ADD,
        dateKey,
        mealType,
        searchParams.get("keyword") ?? undefined,
      ),
      fallbackOptions: {
        state: {
          name: searchParams.get("name") ?? "",
          brand: searchParams.get("brand") ?? "",
          keyword: searchParams.get("keyword") ?? undefined,
        },
      },
    });
  }, [dateKey, mealType, searchParams]);

  const handleCameraActions = useCallback(async () => {
    if (isUploading) return;
    setCaptureErrorFeedback(null);

    let capturedImage: Awaited<ReturnType<typeof requestNativeCameraCapture>>;
    try {
      capturedImage = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "NUTRITION_LABEL",
      });
      setIsAutoOpenPending(false);
    } catch (error) {
      setIsAutoOpenPending(false);
      if (isCameraCaptureCancelled(error)) {
        if (shouldAutoOpenCamera) {
          returnFromCameraPage();
        }
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
      const dateKey = searchParams.get("date");
      const mealType = searchParams.get("mealType");
      const keyword = searchParams.get("keyword");
      const registerParams = new URLSearchParams();

      if (dateKey) {
        registerParams.set("date", dateKey);
      }
      if (mealType) {
        registerParams.set("mealType", mealType);
      }
      if (keyword && keyword.trim().length > 0) {
        registerParams.set("keyword", keyword.trim());
      }
      const registerPath = registerParams.toString().length
        ? `${PATH.NUTRIENT_ADD_REGISTER}?${registerParams.toString()}`
        : PATH.NUTRIENT_ADD_REGISTER;

      navigateBackAndPush({
        count: 2,
        animate: false,
        to: registerPath,
        pushOptions: {
          state: {
            ...imageData, // unit, weight, calories, carbs...
            name: searchParams.get("name") ?? "",
            brand: searchParams.get("brand") ?? "",
            entrySource: "camera" as const,
            dateKey: dateKey ?? undefined,
            mealType: mealType ?? undefined,
            keyword: keyword ?? undefined,
          },
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
    isUploading,
    returnFromCameraPage,
    searchParams,
    shouldAutoOpenCamera,
    uploadImage,
  ]);

  useEffect(() => {
    if (!shouldAutoOpenCamera || autoTriggeredRef.current) {
      return;
    }

    autoTriggeredRef.current = true;
    void handleCameraActions();
  }, [handleCameraActions, shouldAutoOpenCamera]);

  return (
    <section className={styles.page}>
      {shouldHideWebCameraPrompt ? null : (
        <PageHeader title="영양정보 촬영" onBack={returnFromCameraPage} />
      )}

      {isUploading ? (
        <CameraLoading description="영양 성분을 확인하고 있어요" previewSrc={capturedPreviewSrc} />
      ) : shouldHideWebCameraPrompt ? (
        <main className={styles.main} />
      ) : (
        <main className={styles.main}>
          {/* <div className={styles.content}>
            <img src="/icons/camera-icon.svg" alt="카메라 아이콘" className={styles.image} />
            <p className="typo-title1">
              영양성분표 전체가 선명하게
              <br />
              보이도록 촬영해주세요
            </p>
          </div> */}
          <div className={styles.actionButtons}>
            <Button
              variant="filled"
              interaction="normal"
              size="small"
              color="primary"
              onClick={handleCameraActions}
            >
              촬영하기
            </Button>
          </div>
        </main>
      )}

      <CheckButtonModal
        open={captureErrorFeedback !== null}
        onOpenChange={(open) => {
          if (!open) setCaptureErrorFeedback(null);
        }}
        title={captureErrorFeedback?.title ?? ""}
        description={captureErrorFeedback?.description}
      />
    </section>
  );
}
