import { useCallback, useEffect, useRef, useState } from "react";

import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { useCreateMealRecordByFoodImageMutation } from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
import styles from "@/features/camera/styles/CameraPage.module.css";
import {
  type CameraCaptureErrorFeedback,
  DEFAULT_CAMERA_CAPTURE_QUALITY,
  getAnalyticsErrorMessage,
  getCameraCaptureErrorFeedback,
  getCapturedImagePreviewSrc,
  getRecognitionErrorFeedback,
  isCameraCaptureCancelled,
} from "@/features/camera/utils/cameraCapture";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
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
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

export default function FoodCameraPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isOpeningCamera, setIsOpeningCamera] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedPreviewSrc, setCapturedPreviewSrc] = useState<string | null>(null);
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const autoTriggeredRef = useRef(false);

  const { mutateAsync: uploadImage } = useCreateMealRecordByFoodImageMutation();
  const { mutateAsync: mealRegisterAsync } = useTodayMealRecordRegisterMutation();

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const draftKey = formatMenuDraftKey(dateKey, mealType);

  const upsertMenu = useMenuDraftUpsert();

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
      setIsOpeningCamera(true);
      capturedImage = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "FOOD",
      });
      setIsOpeningCamera(false);
    } catch (error) {
      setIsOpeningCamera(false);
      if (isCameraCaptureCancelled(error)) {
        track(EVENT_NAME.FOOD_SCAN_CANCEL, {
          source: "meal_record_camera",
        });
        returnFromCameraPage();
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

      const currentMenus = useMenuDraftStore.getState().drafts[draftKey]?.existingMenus ?? [];
      const nextMenuIds = new Set(currentMenus.map((menu) => menu.id));
      imageData.menu_ids.forEach((id) => {
        nextMenuIds.add(id);
      });

      if (nextMenuIds.size > MAX_MEAL_RECORD_MENUS) {
        toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
        setCapturedPreviewSrc(null);
        setIsUploading(false);
        returnFromCameraPage();
        return;
      }

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
    upsertMenu,
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
      <PageHeader title="음식 촬영" onBack={returnFromCameraPage} />

      {isOpeningCamera ? (
        <main className={styles.main} />
      ) : isUploading ? (
        <CameraLoading description="음식을 분석하고 있어요" previewSrc={capturedPreviewSrc} />
      ) : (
        <main className={styles.main} />
      )}

      <CheckButtonModal
        open={captureErrorFeedback !== null}
        onOpenChange={handleCaptureErrorModalOpenChange}
        // title={captureErrorFeedback?.title ?? ""}
        // description={captureErrorFeedback?.description}
        title={"음식을 인식하기 어려웠어요"}
        description={"음식이 잘 보이도록 다시 촬영해 주세요"}
      />
    </section>
  );
}
