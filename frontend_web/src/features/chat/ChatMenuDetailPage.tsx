import { useEffect, useMemo, useState } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import { useRequestChatMealRecordFocus } from "@/features/chat/stores/mealRecordFocus.store";
import styles from "@/features/chat/styles/ChatMenuDetailPage.module.css";
import {
  buildDiaryMealRecordRequest,
  getChatDateKey,
  getCurrentMealTime,
  getDiaryMealImage,
  getDiaryMealMenuSelection,
  getNextDiaryMenusByCandidateIds,
} from "@/features/chat/utils/chatDiaryMealRecord";
import { getMealTypeFromChatMealTime } from "@/features/chat/utils/chatMeal";
import {
  type ChatMenuDetailNavigationState,
  getFeedbackResultPath,
  getRecommendResultPath,
  getSafeChatId,
  getSafeMenuId,
} from "@/features/chat/utils/recommendNavigation";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import {
  MealMenuNutrientDetail,
  type MealMenuNutrientSelection,
} from "@/features/meal-record/components/MealMenuNutrientDetail";
import { MealMenuNutrientDetailSkeleton } from "@/features/meal-record/components/MealMenuNutrientDetailSkeleton";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import { useTodayMealRecordRegisterMutation } from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import { PATH } from "@/router/path";
import { AppApiError } from "@/shared/api/appApi";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

export default function ChatMenuDetailPage() {
  const navigate = useNavigate();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selection, setSelection] = useState<MealMenuNutrientSelection | null>(null);
  const location = useLocation<ChatMenuDetailNavigationState>();
  const [searchParams] = useSearchParams();
  const chatId = getSafeChatId(searchParams.get("chatId"));
  const menuId = getSafeMenuId(searchParams.get("menuId"));
  const onConfirmSelection = location.state?.onConfirmSelection;
  const hasSelectionCallback = typeof onConfirmSelection === "function";
  const fallbackTo =
    location.state?.fallbackTo ??
    (chatId === null || !hasSelectionCallback
      ? PATH.CHAT
      : location.pathname.startsWith(PATH.RECOMMEND_DETAIL)
        ? getRecommendResultPath(chatId)
        : getFeedbackResultPath(chatId));
  const initialSelection =
    location.state?.initialSelection?.menuId === menuId ? location.state.initialSelection : null;

  const { data: chatHistory, isPending: isChatHistoryPending } = useGetChatHistoryQuery();
  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return chatHistory?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatHistory?.chat_list, chatId]);

  useEffect(() => {
    if (hasSelectionCallback || isChatHistoryPending || chatItem) return;

    toast.warning("채팅 정보를 불러오지 못했어요.");
    navigate(PATH.CHAT, { replace: true });
  }, [chatItem, hasSelectionCallback, isChatHistoryPending, navigate]);

  const chatDateKey = useMemo(
    () => (!hasSelectionCallback && chatItem ? getChatDateKey(chatItem) : ""),
    [chatItem, hasSelectionCallback],
  );
  const { data: dayMeals, isPending: isDayMealsPending } = useDayMealsQuery(chatDateKey);
  const { mutateAsync: registerDiaryMealRecordMutate, isPending: isMealRegisterPending } =
    useTodayMealRecordRegisterMutation();
  const requestChatMealRecordFocus = useRequestChatMealRecordFocus();
  const diaryMenuSelection = useMemo(() => {
    if (hasSelectionCallback || menuId === null) {
      return null;
    }

    return getDiaryMealMenuSelection(dayMeals, menuId);
  }, [dayMeals, hasSelectionCallback, menuId]);
  const resolvedInitialSelection =
    initialSelection ??
    (diaryMenuSelection && menuId !== null
      ? {
          menuId,
          quantity: diaryMenuSelection.menu.quantity,
          mode: diaryMenuSelection.menu.mode,
        }
      : null);
  const footerLabel = resolvedInitialSelection ? "수정하기" : "담기";
  const isDirectSubmitPending =
    !hasSelectionCallback && (isChatHistoryPending || isDayMealsPending || !chatItem || !dayMeals);

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

    if (chatId === null || !chatItem || !dayMeals) {
      toast.warning("식사 기록을 등록할 수 없어요.");
      return;
    }

    try {
      const targetMealTime = diaryMenuSelection?.time ?? getCurrentMealTime();
      const nextMenus = getNextDiaryMenusByCandidateIds({
        dayMeals,
        time: targetMealTime,
        selectedMenus: [
          {
            id: menuId,
            quantity: selection.quantity,
            mode: selection.mode,
          },
        ],
        candidateIds: [menuId],
      });

      if (nextMenus.length > MAX_MEAL_RECORD_MENUS) {
        toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
        return;
      }

      await registerDiaryMealRecordMutate(
        buildDiaryMealRecordRequest({
          dateKey: chatDateKey,
          mealType: getMealTypeFromChatMealTime(targetMealTime),
          selectedMenus: nextMenus,
          image: getDiaryMealImage(dayMeals, targetMealTime),
        }),
      );

      toast.success(diaryMenuSelection ? "식사 기록이 수정되었어요." : "식사 기록이 등록되었어요.");
      requestChatMealRecordFocus({
        dateKey: chatDateKey,
        mealTime: targetMealTime,
      });
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
            initialQuantity={resolvedInitialSelection?.quantity}
            initialMode={resolvedInitialSelection?.mode}
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
            selection && !isMealRegisterPending && !isDirectSubmitPending ? "normal" : "disable"
          }
          disabled={!selection || isMealRegisterPending || isDirectSubmitPending}
        >
          {footerLabel}
        </Button>
      </footer>
    </section>
  );
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
