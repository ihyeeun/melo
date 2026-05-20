import { useCallback, useEffect, useRef, useState } from "react";

import styles from "@/features/camera/CameraPage.module.css";
import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { useFoodImageMutation } from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
import {
  type CameraCaptureErrorFeedback,
  DEFAULT_CAMERA_CAPTURE_QUALITY,
  getAnalyticsErrorMessage,
  getCameraCaptureErrorFeedback,
  getCapturedImagePreviewSrc,
  getRecognitionErrorFeedback,
  isCameraCaptureCancelled,
} from "@/features/camera/utils/cameraCapture";
import { useTodayMealRecordRegisterMutation } from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import {
  formatMenuDraftKey,
  useMenuDraftStore,
  useMenuDraftUpsert,
} from "@/features/meal-record/stores/menuDraft.store";
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import { getMealRecordPath } from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { type MealTime, MENU_INPUT_MODE } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

type FoodCameraLocationState = {
  autoOpenCamera?: boolean;
};

export default function FoodCameraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isUploading, setIsUploading] = useState(false);
  const [capturedPreviewSrc, setCapturedPreviewSrc] = useState<string | null>(null);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const autoTriggeredRef = useRef(false);

  const { mutateAsync: uploadImage } = useFoodImageMutation();
  const { mutateAsync: mealRegisterAsync } = useTodayMealRecordRegisterMutation();

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const draftKey = formatMenuDraftKey(dateKey, mealType);

  const upsertMenu = useMenuDraftUpsert();
  const locationState = (location.state ?? {}) as FoodCameraLocationState;
  const shouldAutoOpenCamera = locationState.autoOpenCamera === true;
  const [isAutoOpenPending, setIsAutoOpenPending] = useState(shouldAutoOpenCamera);
  const shouldHideWebCameraPrompt =
    isAutoOpenPending && !isUploading && captureErrorFeedback === null;

  const returnFromCameraPage = useCallback(() => {
    navigateBack({ fallbackTo: getMealRecordPath(dateKey, mealType) });
  }, [dateKey, mealType]);

  const handleCameraActions = useCallback(async () => {
    if (isUploading) return;
    setCaptureErrorFeedback(null);
    track(EVENT_NAME.FOOD_SCAN_START, {
      source: "meal_record_camera",
    });

    let capturedImage: Awaited<ReturnType<typeof requestNativeCameraCapture>>;
    try {
      capturedImage = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "FOOD",
      });
      setIsAutoOpenPending(false);
    } catch (error) {
      setIsAutoOpenPending(false);
      if (isCameraCaptureCancelled(error)) {
        track(EVENT_NAME.FOOD_SCAN_FAIL, {
          reason: "user_cancelled",
          source: "meal_record_camera",
        });
        if (shouldAutoOpenCamera) {
          returnFromCameraPage();
        }
        return;
      }
      track(EVENT_NAME.FOOD_SCAN_FAIL, {
        reason: getAnalyticsErrorMessage(error, "카메라를 실행하지 못했어요"),
        source: "meal_record_camera",
      });
      setCapturedPreviewSrc(null);
      setCaptureErrorFeedback(getCameraCaptureErrorFeedback(error));
      return;
    }

    let hasRecognitionSucceeded = false;
    try {
      setCapturedPreviewSrc(getCapturedImagePreviewSrc(capturedImage));
      setIsUploading(true);
      const imageData = await uploadImage(capturedImage);

      if (!imageData?.menu_ids?.length) {
        track(EVENT_NAME.FOOD_SCAN_FAIL, {
          reason: "사진에서 음식을 찾을 수 없어요.",
          source: "meal_record_camera",
        });
        setCapturedPreviewSrc(null);
        setCaptureErrorFeedback(getRecognitionErrorFeedback("FOOD"));
        return;
      }
      hasRecognitionSucceeded = true;
      track(EVENT_NAME.FOOD_SCAN_SUCCESS, {
        source: "meal_record_camera",
      });

      imageData.menu_ids.forEach((id, idx) => {
        upsertMenu({
          key: draftKey,
          id,
          quantity: imageData.menu_quantities[idx] ?? 1,
        });
      });

      const latestMenus = useMenuDraftStore.getState().drafts[draftKey]?.existingMenus ?? [];

      await mealRegisterAsync({
        date: dateKey,
        time: Number(mealType) as MealTime,
        menu_ids: latestMenus.map((m) => m.id),
        menu_quantities: latestMenus.map((m) => m.quantity),
        menu_input_modes: latestMenus.map((menu) =>
          menu.mode === "unit" ? MENU_INPUT_MODE.UNIT : MENU_INPUT_MODE.WEIGHT,
        ),
        image: imageData.image_url,
      });

      toast.success("촬영한 사진의 메뉴가 기록되었어요.");
      navigate(getMealRecordPath(dateKey, mealType), { replace: true });
    } catch (error) {
      if (!hasRecognitionSucceeded) {
        track(EVENT_NAME.FOOD_SCAN_FAIL, {
          reason: getAnalyticsErrorMessage(error, "음식 메뉴 분석에 실패했어요."),
          source: "meal_record_camera",
        });
      }
      setCapturedPreviewSrc(null);
      setCaptureErrorFeedback(getRecognitionErrorFeedback("FOOD", error));
    } finally {
      setIsUploading(false);
    }
  }, [
    dateKey,
    draftKey,
    isUploading,
    mealRegisterAsync,
    mealType,
    navigate,
    returnFromCameraPage,
    shouldAutoOpenCamera,
    upsertMenu,
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
        <PageHeader title="음식 촬영" onBack={returnFromCameraPage} />
      )}

      {isUploading ? (
        <CameraLoading description="음식을 분석하고 있어요" previewSrc={capturedPreviewSrc} />
      ) : shouldHideWebCameraPrompt ? (
        <main className={styles.main} />
      ) : (
        <main className={styles.main}>
          {/* <div className={styles.content}>
            <img src="/icons/food-icon.svg" alt="카메라 아이콘" className={styles.image} />
            <p className="typo-title1">
              음식이 잘 보이도록
              <br />
              촬영해주세요
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
