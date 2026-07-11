import { useActivity } from "@stackflow/react";
import { useEffect, useMemo } from "react";

import {
  ChatMealRecordBottomSheet,
  type ChatMealRecordMenu,
} from "@/features/chat/components/ChatMealRecordBottomSheet";
import {
  useChatMealRecordEditSheetContext,
  useChatMealRecordEditSheetMealType,
  useCloseChatMealRecordEditSheet,
  useSetChatMealRecordEditSheetMealType,
} from "@/features/chat/stores/chatMealRecordEditSheet.store";
import { useRequestChatMealRecordFocus } from "@/features/chat/stores/mealRecordFocus.store";
import { getMealTypeFromChatMealTime } from "@/features/chat/utils/chatMeal";
import { getChatMealRecordBottomSheetPath } from "@/features/chat/utils/chatMealRecordBottomSheetPath";
import { buildChatMealRecordTransferState } from "@/features/chat/utils/chatMealRecordTransfer";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import {
  DELETE_MEAL_RECORD_RESULT,
  useTodayMealRecordDeleteWithRollbackMutation,
  useTodayMealRecordRegisterMutation,
} from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import {
  type MenuDraftType,
  mergeMenuDraftMenus,
  useMenuDraftPrepareRegisterRequest,
} from "@/features/meal-record/stores/menuDraft.store";
import { toMenuDraftSeed } from "@/features/meal-record/utils/menuDraftSync";
import { PATH } from "@/router/path";
import { getMealRecordPath } from "@/router/pathHelpers";
import type { MealServingInputMode, MealTime, MealType } from "@/shared/api/types/api.dto";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack, useNavigate } from "@/shared/navigation/stackflowNavigation";

type ChatSelectedMealRecordMenu = {
  id: number;
  quantity: number;
  mode: MealServingInputMode;
};

export default function ChatMealRecordBottomSheetPage() {
  const activity = useActivity();
  const navigate = useNavigate();
  const context = useChatMealRecordEditSheetContext();
  const mealType = useChatMealRecordEditSheetMealType();
  const closeEditSheet = useCloseChatMealRecordEditSheet();
  const setMealType = useSetChatMealRecordEditSheetMealType();
  const requestChatMealRecordFocus = useRequestChatMealRecordFocus();
  const { mutateAsync: registerDiaryMealRecordMutate, isPending: isDiaryMealRegisterPending } =
    useTodayMealRecordRegisterMutation();
  const { mutateAsync: deleteDiaryMealRecordMutate, isPending: isDiaryMealDeletePending } =
    useTodayMealRecordDeleteWithRollbackMutation();
  const prepareRegisterRequest = useMenuDraftPrepareRegisterRequest();
  const isMealRecordEditPending = isDiaryMealRegisterPending || isDiaryMealDeletePending;
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";

  useEffect(() => {
    return () => {
      closeEditSheet();
    };
  }, [closeEditSheet]);

  useEffect(() => {
    if (context !== null) {
      return;
    }

    navigateBack({ fallbackTo: PATH.CHAT });
  }, [context]);

  const editingMealRecordMenus = useMemo(() => {
    if (context === null) {
      return [];
    }

    const menuById = new Map<number, ChatMealRecordMenu>();
    const appendMenus = (menus: ChatMealRecordMenu[]) => {
      menus.forEach((menu) => {
        menuById.set(menu.menu_id, menu);
      });
    };
    const editingMealTime = Number(mealType) as MealTime;

    appendMenus(context.menus);
    appendMenus(context.dayMeals.menusByTime[editingMealTime].map(toChatMealRecordMenu));

    return [...menuById.values()];
  }, [context, mealType]);

  if (context === null) {
    return null;
  }

  const closeSheet = () => {
    if (!activity.isActive) {
      return;
    }

    navigateBack({ fallbackTo: PATH.CHAT });
  };

  const getEditingMovedMenus = (selectedMenus: ChatSelectedMealRecordMenu[]) => {
    const previousMenuIds = new Set(context.previousMealRecord.menus.map((menu) => menu.id));

    return selectedMenus.filter((menu) => previousMenuIds.has(menu.id));
  };

  const handleMealTypeChange = (
    nextMealType: MealType,
    selectedMenus: ChatSelectedMealRecordMenu[],
  ) => {
    if (nextMealType === mealType) {
      return selectedMenus;
    }

    const previousMealRecord = context.previousMealRecord;
    const nextTime = Number(nextMealType) as MealTime;
    const movedMenus = getEditingMovedMenus(selectedMenus);
    const nextServerMenus = context.dayMeals.menusByTime[nextTime].map(toMenuDraftSeed);
    const nextMenus =
      previousMealRecord.time === nextTime
        ? movedMenus
        : mergeMenuDraftMenus({
            baseMenus: nextServerMenus,
            overrideMenus: movedMenus,
          });

    setMealType(nextMealType);
    return normalizeSelectedMenus(nextMenus);
  };

  const handleAddMore = (selectedMenus: ChatSelectedMealRecordMenu[]) => {
    const previousMealRecord = context.previousMealRecord;
    const previousMealType = getMealTypeFromChatMealTime(previousMealRecord.time);
    const nextTime = Number(mealType) as MealTime;

    if (selectedMenus.length > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
      return;
    }

    navigate(getMealRecordPath(context.dateKey, mealType), {
      replace: true,
      state: buildChatMealRecordTransferState({
        dateKey: context.dateKey,
        mealType,
        selectedMenus,
        clearMealTypes: previousMealRecord.time !== nextTime ? [previousMealType] : undefined,
        menus: editingMealRecordMenus,
      }),
    });
  };

  const handleSubmit = async (selectedMenus: ChatSelectedMealRecordMenu[]) => {
    if (isMealRecordEditPending) {
      return false;
    }

    return submitMealRecordEdit(selectedMenus);
  };

  const submitMealRecordEdit = async (selectedMenus: ChatSelectedMealRecordMenu[]) => {
    const previousMealRecord = context.previousMealRecord;
    const previousMealType = getMealTypeFromChatMealTime(previousMealRecord.time);
    const nextTime = Number(mealType) as MealTime;
    const nextMenus = selectedMenus;

    if (nextMenus.length > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
      return false;
    }

    const restorePreviousMealRecord = async () => {
      if (previousMealRecord.time === nextTime) {
        return;
      }

      await registerDiaryMealRecordMutate(
        prepareRegisterRequest({
          dateKey: context.dateKey,
          mealType: previousMealType,
          menus: previousMealRecord.menus,
          image: context.image,
          mealTime: context.dayMeals.mealRecordMealTimesByTime[previousMealRecord.time],
        }),
      );
    };

    try {
      if (previousMealRecord.time !== nextTime) {
        const deleteResult = await deleteDiaryMealRecordMutate({
          dateKey: context.dateKey,
          request: prepareRegisterRequest({
            dateKey: context.dateKey,
            mealType: previousMealType,
            menus: [],
            image: context.image,
            mealTime: context.dayMeals.mealRecordMealTimesByTime[previousMealRecord.time],
          }),
          currentMenusByTime: context.dayMeals.menusByTime,
        });

        if (deleteResult !== DELETE_MEAL_RECORD_RESULT.DELETED) {
          toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          return false;
        }
      }

      if (nextMenus.length === 0) {
        const deleteResult = await deleteDiaryMealRecordMutate({
          dateKey: context.dateKey,
          request: prepareRegisterRequest({
            dateKey: context.dateKey,
            mealType,
            menus: [],
            image:
              previousMealRecord.time === nextTime
                ? context.image
                : getMealRecordImage(context.dayMeals, nextTime),
            mealTime: context.dayMeals.mealRecordMealTimesByTime[nextTime],
          }),
          currentMenusByTime: context.dayMeals.menusByTime,
        });

        if (deleteResult !== DELETE_MEAL_RECORD_RESULT.DELETED) {
          await restorePreviousMealRecord();
          toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
          return false;
        }

        toast.success("식사 기록을 취소했어요.");
        navigateBack({ fallbackTo: PATH.CHAT });
        return true;
      }

      await registerDiaryMealRecordMutate(
        prepareRegisterRequest({
          dateKey: context.dateKey,
          mealType,
          menus: nextMenus,
          image:
            previousMealRecord.time === nextTime
              ? context.image
              : getMealRecordImage(context.dayMeals, nextTime),
          mealTime: context.dayMeals.mealRecordMealTimesByTime[nextTime],
        }),
      );

      toast.success("식사 기록이 수정되었어요.");
      requestChatMealRecordFocus({
        dateKey: context.dateKey,
        mealTime: nextTime,
      });
      navigateBack({ fallbackTo: PATH.CHAT });
      return true;
    } catch {
      if (previousMealRecord.time !== nextTime) {
        try {
          await restorePreviousMealRecord();
        } catch {
          // The user-facing recovery path is to retry after the cache refetch.
        }
      }

      toast.warning("식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      return false;
    }
  };

  return (
    <ChatMealRecordBottomSheet
      key={`${context.dateKey}:${context.previousMealRecord.time}`}
      isOpen={isOpen}
      isActive={activity.isActive}
      recommendations={editingMealRecordMenus}
      initialSelectedMenus={normalizeSelectedMenus(context.previousMealRecord.menus)}
      mealType={mealType}
      dateKey={context.dateKey}
      submitLabel="수정하기"
      isSubmitPending={isMealRecordEditPending}
      detailFallbackTo={getChatMealRecordBottomSheetPath(context.dateKey, mealType)}
      modal={false}
      positionerStyle={{
        pointerEvents: activity.isActive ? undefined : "none",
        zIndex: activity.zIndex,
      }}
      onMealTypeChange={handleMealTypeChange}
      onAddMore={handleAddMore}
      onClose={closeSheet}
      onSubmit={handleSubmit}
    />
  );
}

function toChatMealRecordMenu(menu: MenuWithQuantity): ChatMealRecordMenu {
  return {
    menu_id: menu.id,
    menu_name: menu.name,
    brand: menu.brand,
    unit: menu.unit,
    weight: menu.weight,
    unit_quantity: menu.unit_quantity,
    calories: getBaseCalories(menu),
  };
}

function getBaseCalories(menu: MenuWithQuantity) {
  if (menu.weight > 0 && menu.quantity > 0) {
    return menu.calories * (menu.weight / menu.quantity);
  }

  return menu.calories;
}

function getMealRecordImage(dayMeals: { imagesByTime?: Record<MealTime, string> }, mealTime: MealTime) {
  const image = dayMeals.imagesByTime?.[mealTime];
  return typeof image === "string" && image.trim().length > 0 ? image : undefined;
}

function normalizeSelectedMenus(menus: MenuDraftType[]): ChatSelectedMealRecordMenu[] {
  return menus.map((menu) => ({
    id: menu.id,
    quantity: menu.quantity,
    mode: menu.mode ?? "unit",
  }));
}
