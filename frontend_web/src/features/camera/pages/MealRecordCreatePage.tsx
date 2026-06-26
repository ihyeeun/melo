import { useCallback, useEffect, useRef, useState } from "react";

import { CameraLoading } from "@/features/camera/components/CameraLoading";
import {
  useCreateMealRecordByFoodImageMutation,
  useCreateMenuByNutritionLabelImageMutation,
} from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
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
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { type MealTime, MENU_INPUT_MODE } from "@/shared/api/types/api.dto";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  isPreviousStackActivity,
  navigateBack,
  navigateBackAndPush,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

const MEAL_RECORD_CAMERA_LOADING_DESCRIPTION = {
  FOOD: "음식을 분석하고 있어요",
  NUTRITION_LABEL: "영양 성분을 확인하고 있어요",
} as const;

type MealRecordCameraMode = keyof typeof MEAL_RECORD_CAMERA_LOADING_DESCRIPTION;
type CapturedImage = Awaited<ReturnType<typeof requestNativeCameraCapture>>;

function resolveMealRecordCameraMode(mode: CapturedImage["mode"]): MealRecordCameraMode {
  return mode === "NUTRITION_LABEL" ? "NUTRITION_LABEL" : "FOOD";
}

export default function MealRecordCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isOpeningCamera, setIsOpeningCamera] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedPreviewSrc, setCapturedPreviewSrc] = useState<string | null>(null);
  const [loadingDescription, setLoadingDescription] = useState<string>(
    MEAL_RECORD_CAMERA_LOADING_DESCRIPTION.FOOD,
  );
  const [captureErrorFeedback, setCaptureErrorFeedback] =
    useState<CameraCaptureErrorFeedback | null>(null);
  const autoTriggeredRef = useRef(false);

  const { mutateAsync: uploadFoodImage } = useCreateMealRecordByFoodImageMutation();
  const { mutateAsync: uploadNutritionLabelImage } =
    useCreateMenuByNutritionLabelImageMutation();
  const { mutateAsync: mealRegisterAsync } = useTodayMealRecordRegisterMutation();

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const draftKey = formatMenuDraftKey(dateKey, mealType);

  const upsertMenu = useMenuDraftUpsert();

  const returnFromCameraPage = useCallback(() => {
    navigateBack({ fallbackTo: getMealRecordPath(dateKey, mealType) });
  }, [dateKey, mealType]);

  const createNutritionLabelRegisterPath = useCallback(() => {
    const rawDateKey = searchParams.get("date");
    const rawMealType = searchParams.get("mealType");
    const keyword = searchParams.get("keyword");
    const registerParams = new URLSearchParams();

    if (rawDateKey) {
      registerParams.set("date", rawDateKey);
    }
    if (rawMealType) {
      registerParams.set("mealType", rawMealType);
    }
    if (keyword && keyword.trim().length > 0) {
      registerParams.set("keyword", keyword.trim());
    }

    return registerParams.toString().length
      ? `${PATH.NUTRIENT_ADD_REGISTER}?${registerParams.toString()}`
      : PATH.NUTRIENT_ADD_REGISTER;
  }, [searchParams]);

  const handleFoodImage = useCallback(
    async (capturedImage: CapturedImage) => {
      let hasRecognitionSucceeded = false;

      try {
        track(EVENT_NAME.FOOD_SCAN_START, {
          source: "meal_record_camera",
        });

        const imageData = await uploadFoodImage(capturedImage);

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
      }
    },
    [
      dateKey,
      draftKey,
      mealRegisterAsync,
      mealType,
      navigate,
      returnFromCameraPage,
      upsertMenu,
      uploadFoodImage,
    ],
  );

  const handleNutritionLabelImage = useCallback(
    async (capturedImage: CapturedImage) => {
      try {
        const imageData = await uploadNutritionLabelImage(capturedImage);
        const rawDateKey = searchParams.get("date");
        const rawMealType = searchParams.get("mealType");
        const keyword = searchParams.get("keyword");
        const registerPath = createNutritionLabelRegisterPath();
        const popCount = isPreviousStackActivity("NutrientAdd") ? 2 : 1;

        navigateBackAndPush({
          count: popCount,
          animate: false,
          to: registerPath,
          pushOptions: {
            state: {
              ...imageData,
              dateKey: rawDateKey ?? undefined,
              mealType: rawMealType ?? undefined,
              keyword: keyword ?? undefined,
            },
          },
        });

        toast.success("영양성분표 분석이 완료되었어요.");
      } catch (error) {
        setCapturedPreviewSrc(null);
        setCaptureErrorFeedback(getRecognitionErrorFeedback("NUTRITION_LABEL", error));
      }
    },
    [createNutritionLabelRegisterPath, searchParams, uploadNutritionLabelImage],
  );

  const handleCameraActions = useCallback(async () => {
    if (isUploading) return;
    setCaptureErrorFeedback(null);

    let capturedImage: CapturedImage;
    try {
      setIsOpeningCamera(true);
      capturedImage = await requestNativeCameraCapture({
        quality: DEFAULT_CAMERA_CAPTURE_QUALITY,
        mode: "FOOD",
        selectableModes: ["FOOD", "NUTRITION_LABEL"],
      });
      setIsOpeningCamera(false);
    } catch (error) {
      setIsOpeningCamera(false);
      if (isCameraCaptureCancelled(error)) {
        track(EVENT_NAME.CAMERA_CANCEL);
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

    const selectedMode = resolveMealRecordCameraMode(capturedImage.mode);

    setCapturedPreviewSrc(getCapturedImagePreviewSrc(capturedImage));
    setLoadingDescription(MEAL_RECORD_CAMERA_LOADING_DESCRIPTION[selectedMode]);
    setIsUploading(true);

    try {
      if (selectedMode === "NUTRITION_LABEL") {
        await handleNutritionLabelImage(capturedImage);
        return;
      }

      await handleFoodImage(capturedImage);
    } finally {
      setIsUploading(false);
    }
  }, [handleFoodImage, handleNutritionLabelImage, isUploading, returnFromCameraPage]);

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
      <PageHeader title="사진 촬영" onBack={returnFromCameraPage} />

      {isOpeningCamera ? (
        <main className={styles.main} />
      ) : isUploading ? (
        <CameraLoading description={loadingDescription} previewSrc={capturedPreviewSrc} />
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
