import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";

import { mealDelete } from "@/features/chat/api/chat.api";
import { queryKeys as chatQueryKeys } from "@/features/chat/hooks/queries/queryKey";
import { getDayMeals } from "@/features/home/api/dayMeal";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/queryKey";
import type { DayMealSummary, MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import {
  deleteTodayMealRecord,
  postTodayMealRecordRegister,
} from "@/features/meal-record/api/DayMeal";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import {
  type ChatHistoryItemResponseDto,
  type MealMenuInputMode,
  type MealTime,
  MENU_INPUT_MODE,
  type RegisterMealRequestDto,
} from "@/shared/api/types/api.dto";

type ChatMealRecordMenuPayload = {
  id: number;
  quantity: number;
  inputMode: MealMenuInputMode;
};

type PreviousMealRecord = ChatHistoryItemResponseDto["meal_record"];

type SyncChatMealRecordParams = {
  date: string;
  chatId: number;
  time: MealTime;
  menus: ChatMealRecordMenuPayload[];
  previousMealRecord?: PreviousMealRecord;
  previousDiaryMealRecord?: PreviousMealRecord;
};

type DeleteChatMealRecordParams = {
  date: string;
  chatId: number;
  previousMealRecord?: PreviousMealRecord;
  previousDiaryMealRecord?: PreviousMealRecord;
};

type SyncDiaryMealRecordParams = Omit<SyncChatMealRecordParams, "chatId"> & {
  dayMeals: DayMealSummary;
};

function toMenuInputMode(mode: MenuWithQuantity["serving_input_mode"]): MealMenuInputMode {
  return mode === "weight" ? MENU_INPUT_MODE.WEIGHT : MENU_INPUT_MODE.UNIT;
}

function toDiaryPayload(menu: MenuWithQuantity): ChatMealRecordMenuPayload {
  return {
    id: menu.id,
    quantity: menu.quantity,
    inputMode: toMenuInputMode(menu.serving_input_mode),
  };
}

function getMenusByTime(dayMeals: DayMealSummary, time: MealTime) {
  return dayMeals.menusByTime[time] ?? [];
}

function getImageByTime(dayMeals: DayMealSummary, time: MealTime) {
  const image = dayMeals.imagesByTime[time];
  return typeof image === "string" && image.trim().length > 0 ? image : undefined;
}

function buildRegisterRequest({
  date,
  time,
  menus,
  image,
}: {
  date: string;
  time: MealTime;
  menus: ChatMealRecordMenuPayload[];
  image?: string;
}): RegisterMealRequestDto {
  return {
    date,
    time,
    menu_ids: menus.map((menu) => menu.id),
    menu_quantities: menus.map((menu) => menu.quantity),
    menu_input_modes: menus.map((menu) => menu.inputMode),
    ...(image ? { image } : {}),
  };
}

function mergeMenus(
  baseMenus: ChatMealRecordMenuPayload[],
  overrideMenus: ChatMealRecordMenuPayload[],
) {
  const menuById = new Map<number, ChatMealRecordMenuPayload>();

  baseMenus.forEach((menu) => {
    menuById.set(menu.id, menu);
  });

  overrideMenus.forEach((menu) => {
    menuById.set(menu.id, menu);
  });

  return [...menuById.values()];
}

function getNextDiaryMenusByTime({
  time,
  menus,
  previousMealRecord,
  dayMeals,
}: SyncDiaryMealRecordParams) {
  const previousMenuIds = previousMealRecord?.menu_ids ?? [];
  const previousTime = previousMealRecord?.time;
  const removeIdSet = previousTime === time ? new Set(previousMenuIds) : new Set<number>();
  const baseMenus = getMenusByTime(dayMeals, time)
    .filter((menu) => !removeIdSet.has(menu.id))
    .map(toDiaryPayload);

  return mergeMenus(baseMenus, menus);
}

function assertDiaryMealRecordMenuLimit(menus: ChatMealRecordMenuPayload[]) {
  if (menus.length > MAX_MEAL_RECORD_MENUS) {
    throw new Error(MEAL_RECORD_MENU_LIMIT_MESSAGE);
  }
}

async function deleteStaleChatMealRecord({
  chatId,
  previousMealRecord,
}: {
  chatId: number;
  previousMealRecord?: PreviousMealRecord;
}) {
  if (!previousMealRecord) {
    return;
  }

  await rollbackBestEffort(
    () => mealDelete({ chat_id: chatId }),
    "Failed to delete stale chat meal record",
  );
}

async function replaceDiaryMenusByTime({
  date,
  time,
  nextMenus,
  dayMeals,
}: {
  date: string;
  time: MealTime;
  nextMenus: ChatMealRecordMenuPayload[];
  dayMeals: DayMealSummary;
}) {
  const currentMenus = getMenusByTime(dayMeals, time);

  if (nextMenus.length > 0) {
    await postTodayMealRecordRegister(
      buildRegisterRequest({
        date,
        time,
        menus: nextMenus,
        image: getImageByTime(dayMeals, time),
      }),
    );
    return;
  }

  await Promise.all(
    currentMenus.map((menu) =>
      deleteTodayMealRecord({
        date,
        time,
        menu_id: menu.id,
      }),
    ),
  );
}

async function restoreDiaryMenusByTimeSnapshot({
  date,
  time,
  dayMeals,
}: {
  date: string;
  time: MealTime;
  dayMeals: DayMealSummary;
}) {
  const snapshotMenus = getMenusByTime(dayMeals, time).map(toDiaryPayload);

  if (snapshotMenus.length > 0) {
    await postTodayMealRecordRegister(
      buildRegisterRequest({
        date,
        time,
        menus: snapshotMenus,
        image: getImageByTime(dayMeals, time),
      }),
    );
    return;
  }

  const currentDayMeals = await getDayMeals({ date });
  await Promise.all(
    getMenusByTime(currentDayMeals, time).map((menu) =>
      deleteTodayMealRecord({
        date,
        time,
        menu_id: menu.id,
      }),
    ),
  );
}

async function restoreDiaryMenusBySnapshot({
  date,
  times,
  dayMeals,
}: {
  date: string;
  times: MealTime[];
  dayMeals: DayMealSummary;
}) {
  await Promise.all(
    [...new Set(times)].map((time) =>
      restoreDiaryMenusByTimeSnapshot({
        date,
        time,
        dayMeals,
      }),
    ),
  );
}

async function rollbackBestEffort(rollback: () => Promise<void>, message: string) {
  try {
    await rollback();
  } catch (rollbackError) {
    console.error(message, rollbackError);
  }
}

async function removeDiaryMenusById({
  date,
  time,
  menuIds,
  dayMeals,
}: {
  date: string;
  time: MealTime;
  menuIds: number[];
  dayMeals: DayMealSummary;
}) {
  const removeIdSet = new Set(menuIds);
  const currentMenus = getMenusByTime(dayMeals, time);
  const hasRemoveTarget = currentMenus.some((menu) => removeIdSet.has(menu.id));

  if (!hasRemoveTarget) {
    return;
  }

  const remainingMenus = currentMenus
    .filter((menu) => !removeIdSet.has(menu.id))
    .map(toDiaryPayload);

  await replaceDiaryMenusByTime({
    date,
    time,
    nextMenus: remainingMenus,
    dayMeals,
  });
}

async function syncDiaryMealRecord({
  date,
  time,
  menus,
  previousMealRecord,
  dayMeals,
}: SyncDiaryMealRecordParams) {
  const previousMenuIds = previousMealRecord?.menu_ids ?? [];
  const previousTime = previousMealRecord?.time;
  const nextMenus = getNextDiaryMenusByTime({
    date,
    time,
    menus,
    previousMealRecord,
    dayMeals,
  });

  assertDiaryMealRecordMenuLimit(nextMenus);

  if (previousTime !== undefined && previousTime !== time) {
    await removeDiaryMenusById({
      date,
      time: previousTime,
      menuIds: previousMenuIds,
      dayMeals,
    });
  }

  await replaceDiaryMenusByTime({
    date,
    time,
    nextMenus,
    dayMeals,
  });
}

async function invalidateSyncedMealRecordQueries(queryClient: QueryClient, date: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: homeQueryKeys.dayMeals.byDate(date) }),
    queryClient.invalidateQueries({
      queryKey: chatQueryKeys.chatHistory,
      refetchType: "active",
    }),
  ]);
}

async function fetchDayMealsForSync(queryClient: QueryClient, date: string) {
  return queryClient.fetchQuery({
    queryKey: homeQueryKeys.dayMeals.byDate(date),
    queryFn: () => getDayMeals({ date }),
    staleTime: Infinity,
  });
}

export function useSyncChatMealRecordRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      chatId,
      time,
      menus,
      previousMealRecord,
      previousDiaryMealRecord,
    }: SyncChatMealRecordParams) => {
      const diaryPreviousMealRecord = previousDiaryMealRecord;
      const dayMeals = await fetchDayMealsForSync(queryClient, date);

      assertDiaryMealRecordMenuLimit(
        getNextDiaryMenusByTime({
          date,
          time,
          menus,
          previousMealRecord: diaryPreviousMealRecord,
          dayMeals,
        }),
      );

      try {
        await syncDiaryMealRecord({
          date,
          time,
          menus,
          previousMealRecord: diaryPreviousMealRecord,
          dayMeals,
        });
      } catch (error) {
        await rollbackBestEffort(
          () =>
            restoreDiaryMenusBySnapshot({
              date,
              times: diaryPreviousMealRecord ? [time, diaryPreviousMealRecord.time] : [time],
              dayMeals,
            }),
          "Failed to rollback diary meal record",
        );

        throw error;
      }

      await deleteStaleChatMealRecord({ chatId, previousMealRecord });
    },
    onSuccess: async (_data, variables) => {
      await invalidateSyncedMealRecordQueries(queryClient, variables.date);
    },
  });
}

export function useSyncChatMealRecordDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      chatId,
      previousMealRecord,
      previousDiaryMealRecord,
    }: DeleteChatMealRecordParams) => {
      const diaryPreviousMealRecord = previousDiaryMealRecord;
      const previousMenuIds = diaryPreviousMealRecord?.menu_ids ?? [];

      if (diaryPreviousMealRecord && previousMenuIds.length > 0) {
        const dayMeals = await fetchDayMealsForSync(queryClient, date);

        try {
          await removeDiaryMenusById({
            date,
            time: diaryPreviousMealRecord.time,
            menuIds: previousMenuIds,
            dayMeals,
          });

          await deleteStaleChatMealRecord({ chatId, previousMealRecord });
        } catch (error) {
          await rollbackBestEffort(
            () =>
              restoreDiaryMenusBySnapshot({
                date,
                times: [diaryPreviousMealRecord.time],
                dayMeals,
              }),
            "Failed to rollback diary meal record",
          );

          throw error;
        }
        return;
      }

      await deleteStaleChatMealRecord({ chatId, previousMealRecord });
    },
    onSuccess: async (_data, variables) => {
      await invalidateSyncedMealRecordQueries(queryClient, variables.date);
    },
  });
}
