import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mealDelete, mealRegister } from "@/features/chat/api/chat.api";
import { queryKeys as chatQueryKeys } from "@/features/chat/hooks/queries/queryKey";
import { getDayMeals } from "@/features/home/api/dayMeal";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/queryKey";
import type { DayMealSummary, MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import {
  deleteTodayMealRecord,
  postTodayMealRecordRegister,
} from "@/features/meal-record/api/DayMeal";
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
};

type DeleteChatMealRecordParams = {
  date: string;
  chatId: number;
  previousMealRecord?: PreviousMealRecord;
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
}: Omit<SyncChatMealRecordParams, "chatId"> & {
  dayMeals: DayMealSummary;
}) {
  const previousMenuIds = previousMealRecord?.menu_ids ?? [];
  const previousTime = previousMealRecord?.time;

  if (previousTime !== undefined && previousTime !== time) {
    await removeDiaryMenusById({
      date,
      time: previousTime,
      menuIds: previousMenuIds,
      dayMeals,
    });
  }

  const removeIdSet = previousTime === time ? new Set(previousMenuIds) : new Set<number>();
  const baseMenus = getMenusByTime(dayMeals, time)
    .filter((menu) => !removeIdSet.has(menu.id))
    .map(toDiaryPayload);
  const nextMenus = mergeMenus(baseMenus, menus);

  await replaceDiaryMenusByTime({
    date,
    time,
    nextMenus,
    dayMeals,
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
    }: SyncChatMealRecordParams) => {
      const dayMeals = await queryClient.fetchQuery({
        queryKey: homeQueryKeys.dayMeals.byDate(date),
        queryFn: () => getDayMeals({ date }),
      });

      await mealRegister({
        chat_id: chatId,
        time,
        menu_ids: menus.map((menu) => menu.id),
        menu_quantities: menus.map((menu) => menu.quantity),
        menu_input_modes: menus.map((menu) => menu.inputMode),
      });
      await syncDiaryMealRecord({
        date,
        time,
        menus,
        previousMealRecord,
        dayMeals,
      });
    },
  });
}

export function useSyncChatMealRecordDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, chatId, previousMealRecord }: DeleteChatMealRecordParams) => {
      const previousMenuIds = previousMealRecord?.menu_ids ?? [];

      if (previousMealRecord && previousMenuIds.length > 0) {
        const dayMeals = await queryClient.fetchQuery({
          queryKey: homeQueryKeys.dayMeals.byDate(date),
          queryFn: () => getDayMeals({ date }),
        });

        await removeDiaryMenusById({
          date,
          time: previousMealRecord.time,
          menuIds: previousMenuIds,
          dayMeals,
        });
      }

      await mealDelete({ chat_id: chatId });
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: homeQueryKeys.dayMeals.byDate(variables.date) }),
        queryClient.invalidateQueries({
          queryKey: chatQueryKeys.chatHistory,
          refetchType: "active",
        }),
      ]);
    },
  });
}
