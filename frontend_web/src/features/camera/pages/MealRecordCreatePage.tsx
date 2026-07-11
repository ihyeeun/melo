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
import { trackDiaryMenuSaveByMenuIds } from "@/features/camera/utils/diaryMenuSaveAnalytics";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import { useTodayMealRecordRegisterMutation } from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import {
  formatMenuDraftKey,
  useMenuDraftPrepareRegisterRequest,
  useMenuDraftStore,
} from "@/features/meal-record/stores/menuDraft.store";
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import {
  trackNutritionLabelScanFail,
  trackNutritionLabelScanStart,
  trackNutritionLabelScanSuccess,
} from "@/shared/analytics/nutritionLabelEvents";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

const MEAL_RECORD_CAMERA_LOADING_DESCRIPTION = {
  FOOD: "음식을 분석하고 있어요",
  NUTRITION_LABEL: "영양 성분을 확인하고 있어요",
} as const;

const MEAL_RECORD_NUTRITION_LABEL_SCAN_SOURCE = "diary_nutrition_camera";

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
  const prepareRegisterRequest = useMenuDraftPrepareRegisterRequest();

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
        const recognizedMenus = imageData.menu_ids.map((id, idx) => {
          const quantity = imageData.menu_quantities[idx];

          if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
            return null;
          }

          return { id, quantity };
        });

        if (recognizedMenus.some((menu) => menu === null)) {
          track(EVENT_NAME.FOOD_SCAN_FAIL, {
            reason: "음식 메뉴 분석에 실패했어요.",
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
        const nextMenus = recognizedMenus.reduce<typeof currentMenus>(
          (menus, recognizedMenu) => {
            if (!recognizedMenu) {
              return menus;
            }

            const { id, quantity } = recognizedMenu;
            const existingIndex = menus.findIndex((menu) => menu.id === id);

            if (existingIndex < 0) {
              return [...menus, { id, quantity }];
            }

            return menus.map((menu, index) =>
              index === existingIndex ? { ...menu, quantity } : menu,
            );
          },
          [...currentMenus],
        );

        if (nextMenus.length > MAX_MEAL_RECORD_MENUS) {
          toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
          setCapturedPreviewSrc(null);
          setIsUploading(false);
          returnFromCameraPage();
          return;
        }

        await mealRegisterAsync(
          prepareRegisterRequest({
            dateKey,
            mealType,
            menus: nextMenus,
            image: imageData.image_url,
          }),
          {
            onSuccess: () => {
              void trackDiaryMenuSaveByMenuIds(imageData.menu_ids);
            },
          },
        );

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
      prepareRegisterRequest,
      returnFromCameraPage,
      uploadFoodImage,
    ],
  );

  const handleNutritionLabelImage = useCallback(
    async (capturedImage: CapturedImage) => {
      trackNutritionLabelScanStart({ source: MEAL_RECORD_NUTRITION_LABEL_SCAN_SOURCE });

      let imageData: Awaited<ReturnType<typeof uploadNutritionLabelImage>>;
      try {
        imageData = await uploadNutritionLabelImage(capturedImage);
      } catch (error) {
        trackNutritionLabelScanFail(
          getAnalyticsErrorMessage(error, "영양성분표 분석에 실패했어요."),
          { source: MEAL_RECORD_NUTRITION_LABEL_SCAN_SOURCE },
        );
        setCapturedPreviewSrc(null);
        setCaptureErrorFeedback(getRecognitionErrorFeedback("NUTRITION_LABEL", error));
        return;
      }

      trackNutritionLabelScanSuccess({ source: MEAL_RECORD_NUTRITION_LABEL_SCAN_SOURCE });

      const rawDateKey = searchParams.get("date");
      const rawMealType = searchParams.get("mealType");
      const keyword = searchParams.get("keyword");
      const registerPath = createNutritionLabelRegisterPath();

      navigate(registerPath, {
        replace: true,
        animate: false,
        state: {
          ...imageData,
          dateKey: rawDateKey ?? undefined,
          mealType: rawMealType ?? undefined,
          keyword: keyword ?? undefined,
        },
      });

      toast.success("영양성분표 분석이 완료되었어요.");
    },
    [createNutritionLabelRegisterPath, navigate, searchParams, uploadNutritionLabelImage],
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
