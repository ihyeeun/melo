import { useEffect, useMemo, useState } from "react";

import { useSyncChatMealRecordRegisterMutation } from "@/features/chat/hooks/mutations/useSyncChatMealRecordMutation";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/FeedbackDetailPage.module.css";
import { getMealTypeFromCurrentTime } from "@/features/chat/utils/chatMeal";
import {
  type FeedbackDetailNavigationState,
  getFeedbackResultPath,
  getSafeChatId,
  getSafeMenuId,
} from "@/features/chat/utils/recommendNavigation";
import {
  MealMenuNutrientDetail,
  type MealMenuNutrientSelection,
} from "@/features/meal-record/components/MealMenuNutrientDetail";
import { MealMenuNutrientDetailSkeleton } from "@/features/meal-record/components/MealMenuNutrientDetailSkeleton";
import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/appApi";
import {
  type ChatHistoryItemResponseDto,
  type MealMenuInputMode,
  type MealServingInputMode,
  type MealTime,
  MENU_INPUT_MODE,
} from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useLocation,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";

type SelectedMealRecordMenu = {
  id: number;
  quantity: number;
  inputMode: MealMenuInputMode;
};

export default function FeedbackDetailPage() {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selection, setSelection] = useState<MealMenuNutrientSelection | null>(null);
  const location = useLocation<FeedbackDetailNavigationState>();
  const selectedDateKey = useSelectedDateKey();
  const [searchParams] = useSearchParams();
  const chatId = getSafeChatId(searchParams.get("chatId"));
  const menuId = getSafeMenuId(searchParams.get("menuId"));
  const onConfirmSelection = location.state?.onConfirmSelection;
  const hasSelectionCallback = typeof onConfirmSelection === "function";
  const fallbackTo =
    chatId === null || !hasSelectionCallback ? PATH.CHAT : getFeedbackResultPath(chatId);
  const initialSelection =
    location.state?.initialSelection?.menuId === menuId ? location.state.initialSelection : null;
  const footerLabel = initialSelection ? "수정하기" : "담기";

  const { data: chatHistory, isPending: isChatHistoryPending } = useGetChatHistoryQuery();
  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return chatHistory?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatHistory?.chat_list, chatId]);
  const { mutateAsync: syncMealRecordRegisterMutate, isPending: isMealRegisterPending } =
    useSyncChatMealRecordRegisterMutation();

  const handleConfirmSelection = async () => {
    if (!selection || menuId === null) {
      return;
    }

    if (hasSelectionCallback) {
      onConfirmSelection({
        menuId,
        quantity: selection.quantity,
        mode: selection.mode,
      });
      navigateBack({ fallbackTo });
      return;
    }

    if (chatId === null || !chatItem) {
      toast.warning("식사 기록을 등록할 수 없어요.");
      return;
    }

    try {
      await syncMealRecordRegisterMutate({
        date: selectedDateKey,
        chatId,
        time:
          chatItem.meal_record?.time ??
          (Number(getMealTypeFromCurrentTime(new Date())) as MealTime),
        menus: getNextMealRecordMenus({
          mealRecord: chatItem.meal_record,
          menuId,
          selection,
        }),
        previousMealRecord: chatItem.meal_record,
      });

      toast.success(
        chatItem.meal_record ? "식사 기록이 수정되었어요." : "식사 기록이 등록되었어요.",
      );
      navigateBack({ fallbackTo: PATH.CHAT });
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
    }
  };

  const { data: meal, isPending, isError } = useMealDetailQuery(menuId);

  useEffect(() => {
    if (menuId !== null) return;

    toast.warning("잘못된 접근입니다.");
    navigateBack({ fallbackTo });
  }, [menuId, fallbackTo]);

  useEffect(() => {
    if (!isError) return;

    toast.warning("메뉴 정보를 불러오지 못했어요");
    navigateBack({ fallbackTo });
  }, [isError, fallbackTo]);

  if (isPending) {
    return (
      <section className={styles.page}>
        <PageHeader
          title="영양성분 상세"
          onBack={() => {
            navigateBack({ fallbackTo });
          }}
        />

        <main className={styles.main}>
          <div className={styles.content}>
            <MealMenuNutrientDetailSkeleton showEditSection={false} />
          </div>
        </main>

        <footer className={styles.footer}>
          <Skeleton width="100%" height={48} radius={8} />
        </footer>
      </section>
    );
  }
  if (!meal || menuId === null) return null;

  return (
    <section className={styles.page}>
      <PageHeader
        title="영양성분 상세"
        onBack={() => {
          navigateBack({ fallbackTo });
        }}
      />

      <main className={styles.main}>
        <div className={styles.content}>
          <MealMenuNutrientDetail
            menu={meal}
            initialQuantity={initialSelection?.quantity}
            initialMode={initialSelection?.mode}
            isDetailOpen={isDetailOpen}
            onToggleDetail={() => setIsDetailOpen((prev) => !prev)}
            onSelectionChange={setSelection}
            showEditSection={false}
          />
        </div>
      </main>

      <footer className={styles.footer}>
        <Button
          variant="filled"
          size="large"
          color="primary"
          fullWidth
          onClick={handleConfirmSelection}
          interaction={
            selection && !isMealRegisterPending && (!isChatHistoryPending || hasSelectionCallback)
              ? "normal"
              : "disable"
          }
          disabled={!selection || isMealRegisterPending || (!hasSelectionCallback && isChatHistoryPending)}
        >
          {footerLabel}
        </Button>
      </footer>
    </section>
  );
}

function getNextMealRecordMenus({
  mealRecord,
  menuId,
  selection,
}: {
  mealRecord: ChatHistoryItemResponseDto["meal_record"];
  menuId: number;
  selection: MealMenuNutrientSelection;
}): SelectedMealRecordMenu[] {
  const selectedMenu = {
    id: menuId,
    quantity: selection.quantity,
    inputMode: toMealMenuInputMode(selection.mode),
  };
  const previousMenus = (mealRecord?.menu_ids ?? []).map((id, index) => ({
    id,
    quantity: mealRecord?.menu_quantities?.[index] ?? 1,
    inputMode: mealRecord?.menu_input_modes?.[index] ?? MENU_INPUT_MODE.UNIT,
  }));
  const existingIndex = previousMenus.findIndex((menu) => menu.id === menuId);

  if (existingIndex === -1) {
    return [...previousMenus, selectedMenu];
  }

  return previousMenus.map((menu) => (menu.id === menuId ? selectedMenu : menu));
}

function toMealMenuInputMode(mode: MealServingInputMode): MealMenuInputMode {
  return mode === "weight" ? MENU_INPUT_MODE.WEIGHT : MENU_INPUT_MODE.UNIT;
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof AppApiError && error.message.trim().length > 0) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "식사 기록 저장에 실패했어요. 잠시 후 다시 시도해주세요.";
}
