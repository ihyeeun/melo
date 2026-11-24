import { useActivity } from "@stackflow/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { CameraLoading } from "@/features/camera/components/CameraLoading";
import { MODE } from "@/features/camera/constants/camera.constant";
import {
  useCreateMealRecordByFoodImageMutation,
  useCreateMenuByNutritionLabelImageMutation,
} from "@/features/camera/hooks/mutations/useImageRecognitionMutation";
import styles from "@/features/camera/styles/CameraPage.module.css";
import {
  type CameraCaptureErrorFeedback,
  getAnalyticsErrorMessage,
  getCameraCaptureErrorFeedback,
  getCapturedImagePreviewSrc,
  getRecognitionErrorFeedback,
  isCameraCaptureCancelled,
} from "@/features/camera/utils/cameraCapture";
import { getMealDetail } from "@/features/meal-record/api/mealDetail";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_FILLED_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import {
  menuQueryKeys,
  writeMenuDetailCache,
} from "@/features/meal-record/hooks/queries/menuCache";
import {
  formatMenuDraftKey,
  type MenuDraftType,
  useMenuDraftApplyRecognizedMenus,
  useMenuDraftStore,
} from "@/features/meal-record/stores/menuDraft.store";
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { trackScanMenuSave } from "@/shared/analytics/menuSaveEvent.util";
import {
  trackNutritionLabelScanFail,
  trackNutritionLabelScanStart,
  trackNutritionLabelScanSuccess,
} from "@/shared/analytics/nutritionLabelEvents";
import { requestNativeCameraCapture } from "@/shared/api/bridge/nativeBridge";
import { captureScreenRequestScope, type ScreenRequestScope } from "@/shared/api/screenRequests";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  navigateBackToPathOrPushFromRoot,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import type { MealRecordTransferPreview } from "@/shared/types/mealRecordTransfer";

const MEAL_RECORD_CAMERA_LOADING_DESCRIPTION = {
  FOOD: "음식을 분석하고 있어요",
  NUTRITION_LABEL: "영양성분을 확인하고 있어요",
} as const;

const MEAL_RECORD_NUTRITION_LABEL_SCAN_SOURCE = "diary_nutrition_camera";

type CapturedImage = Awaited<ReturnType<typeof requestNativeCameraCapture>>;

function toMenuPreview(menu: MenuSimpleResponseDto): MealRecordTransferPreview {
  return {
    id: menu.id,
    name: menu.name,
    brand: menu.brand,
    unit_quantity: menu.unit_quantity,
    calories: menu.calories,
    weight: menu.weight ?? undefined,
    unit: menu.unit,
    data_source: menu.data_source,
  };
}

// screen: DIET-02-006
export default function MealRecordCreatePage() {
  const navigate = useNavigate();
  const { id: screenId, isActive: isScreenActive } = useActivity();
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
  const { mutateAsync: uploadNutritionLabelImage } = useCreateMenuByNutritionLabelImageMutation();

  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const draftKey = formatMenuDraftKey(dateKey, mealType);
  const applyRecognizedMenus = useMenuDraftApplyRecognizedMenus();
  const queryClient = useQueryClient();

  const returnFromCameraPage = useCallback(() => {
    navigateBack({ fallbackTo: getMealRecordPath(dateKey, mealType) });
  }, [dateKey, mealType]);

  const createNutritionLabelRegisterPath = useCallback(() => {
    const rawDateKey = searchParams.get("date");
    const rawMealType = searchParams.get("mealType");
    const registerParams = new URLSearchParams();

    if (rawDateKey) {
      registerParams.set("date", rawDateKey);
    }
    if (rawMealType) {
      registerParams.set("mealType", rawMealType);
    }

    return registerParams.toString().length
      ? `${PATH.NUTRIENT_ADD_REGISTER}?${registerParams.toString()}`
      : PATH.NUTRIENT_ADD_REGISTER;
  }, [searchParams]);

  const handleFoodImage = useCallback(
    async (capturedImage: CapturedImage, screen: ScreenRequestScope) => {
      let hasRecognitionSucceeded = false;

      try {
        const imageData = await uploadFoodImage(capturedImage);
        screen.assertActive();

        if (!imageData?.menu_ids?.length) {
          track(EVENT_NAME.FOOD_SCAN_FAIL, {
            reason: "사진에서 음식을 찾을 수 없어요.",
            source: "meal_record_camera",
          });
          setCapturedPreviewSrc(null);
          setCaptureErrorFeedback(getRecognitionErrorFeedback("FOOD"));
          return;
        }
        const currentDraft = useMenuDraftStore.getState().drafts[draftKey];
        const menusById = new Map<number, MenuDraftType>(
          (currentDraft?.existingMenus ?? []).map((menu) => [menu.id, menu]),
        );

        for (const [index, id] of imageData.menu_ids.entries()) {
          const quantity = imageData.menu_quantities[index];

          if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
            throw new Error("음식 메뉴 분석에 실패했어요.");
          }

          const previous = menusById.get(id);

          menusById.set(id, {
            ...previous,
            id,
            quantity,
            name: imageData.menu_names[index]?.trim() || previous?.name,
          });
        }

        hasRecognitionSucceeded = true;
        track(EVENT_NAME.FOOD_SCAN_SUCCESS, {
          source: "meal_record_camera",
        });

        // 100개를 넘으면 이미 담긴 음식부터, 인식된 순서대로 100개까지만 담는다
        const recognizedMenus = Array.from(menusById.values());
        const isOverMenuLimit = recognizedMenus.length > MAX_MEAL_RECORD_MENUS;
        const nextMenus = recognizedMenus.slice(0, MAX_MEAL_RECORD_MENUS);

        // 식사 기록 상세에 보여 줄 음식 정보(칼로리 등)를 받아 둔다. 이미 담겨 있던 음식은 정보가 있다
        const shownMenuIds = new Set([
          ...(currentDraft?.existingMenus ?? []).map((menu) => menu.id),
          ...Object.keys(currentDraft?.previewsById ?? {}).map(Number),
        ]);
        const newMenuDetails = await Promise.all(
          nextMenus
            .filter((menu) => !shownMenuIds.has(menu.id))
            .map((menu) =>
              queryClient.fetchQuery({
                queryKey: menuQueryKeys.detail(menu.id),
                queryFn: async () =>
                  writeMenuDetailCache(queryClient, await getMealDetail(menu.id)),
              }),
            ),
        );
        screen.assertActive();

        // 바로 저장하지 않고 담아 두기만 한다. 저장은 식사 기록 상세의 [완료하기] 때 한다
        applyRecognizedMenus({
          key: draftKey,
          menus: nextMenus,
          previews: newMenuDetails.map(toMenuPreview),
          image: imageData.image_url,
        });
        trackScanMenuSave({
          menus: nextMenus.map((menu) => ({ menu_id: menu.id, menu_name: menu.name })),
          source: "home_tab",
          scanType: "photo",
        });

        if (isOverMenuLimit) {
          toast.warning(MEAL_RECORD_MENU_LIMIT_FILLED_MESSAGE);
        }
        navigateBackToPathOrPushFromRoot({
          animate: false,
          to: getMealRecordPath(dateKey, mealType),
        });
      } catch (error) {
        if (!screen.isActive()) return;
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
    [applyRecognizedMenus, dateKey, draftKey, mealType, queryClient, uploadFoodImage],
  );

  const handleNutritionLabelImage = useCallback(
    async (capturedImage: CapturedImage, screen: ScreenRequestScope) => {
      trackNutritionLabelScanStart({ source: MEAL_RECORD_NUTRITION_LABEL_SCAN_SOURCE });

      let imageData: Awaited<ReturnType<typeof uploadNutritionLabelImage>>;
      try {
        imageData = await uploadNutritionLabelImage(capturedImage);
        screen.assertActive();
      } catch (error) {
        if (!screen.isActive()) return;
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
      const registerPath = createNutritionLabelRegisterPath();

      navigate(registerPath, {
        replace: true,
        animate: false,
        state: {
          ...imageData,
          dateKey: rawDateKey ?? undefined,
          mealType: rawMealType ?? undefined,
        },
      });
    },
    [createNutritionLabelRegisterPath, navigate, searchParams, uploadNutritionLabelImage],
  );

  const handleCameraActions = useCallback(async () => {
    if (isUploading) return;
    const screen = captureScreenRequestScope(screenId);
    if (!screen.isActive()) return;
    autoTriggeredRef.current = true;
    setCaptureErrorFeedback(null);

    let capturedImage: CapturedImage;
    try {
      setIsOpeningCamera(true);
      track(EVENT_NAME.CAMERA_START, { source: "home_tab" });
      capturedImage = await requestNativeCameraCapture({
        mode: MODE.FOOD,
        selectableModes: [MODE.FOOD, MODE.NUTRITION],
      });
      screen.assertActive();
      setIsOpeningCamera(false);
    } catch (error) {
      if (!screen.isActive()) return;
      setIsOpeningCamera(false);
      if (isCameraCaptureCancelled(error)) {
        track(EVENT_NAME.CAMERA_CANCEL, { source: "home_tab" });
        returnFromCameraPage();
        return;
      }
      track(EVENT_NAME.FOOD_SCAN_FAIL, {
        reason: getAnalyticsErrorMessage(error, "카메라를 실행하지 못했어요"),
        source: "home_tab",
      });
      setCapturedPreviewSrc(null);
      setCaptureErrorFeedback(getCameraCaptureErrorFeedback(error));
      return;
    }

    const selectedMode = capturedImage.mode;

    if (selectedMode !== MODE.FOOD && selectedMode !== MODE.NUTRITION) {
      return;
    }

    setCapturedPreviewSrc(getCapturedImagePreviewSrc(capturedImage));
    setLoadingDescription(MEAL_RECORD_CAMERA_LOADING_DESCRIPTION[selectedMode]);
    setIsUploading(true);

    try {
      if (selectedMode === MODE.NUTRITION) {
        await handleNutritionLabelImage(capturedImage, screen);
        return;
      }

      await handleFoodImage(capturedImage, screen);
    } finally {
      setIsUploading(false);
    }
  }, [handleFoodImage, handleNutritionLabelImage, isUploading, returnFromCameraPage, screenId]);

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
      <PageHeader title={isUploading ? "사진 분석" : "사진 촬영"} onBack={returnFromCameraPage} />

      {isOpeningCamera ? (
        <main className={styles.main} />
      ) : isUploading ? (
        <CameraLoading description={loadingDescription} previewSrc={capturedPreviewSrc} />
      ) : (
        <main className={styles.main} />
      )}

      {/* screen: DIET-02-008_modal-analysis-failed, DIET-02-008_modal-invalid-image */}
      <CheckButtonModal
        open={captureErrorFeedback !== null}
        onOpenChange={handleCaptureErrorModalOpenChange}
        title={captureErrorFeedback?.title ?? ""}
        description={captureErrorFeedback?.description}
      />
    </section>
  );
}
