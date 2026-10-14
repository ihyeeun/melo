import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys as calendarQueryKeys } from "@/features/calendar/hooks/queries/calendar.queryKey";
import { getTodayMealRecordMenus } from "@/features/home/api/todayRecord.api";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { postTodayMealRecordRegister } from "@/features/meal-record/api/DayMeal";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import { mergeMenuDraftMenus } from "@/features/meal-record/stores/menuDraft.store";
import { getCurrentMealRecordTime } from "@/features/meal-record/utils/mealRecordTime";
import { toMenuDraftSeed } from "@/features/meal-record/utils/menuDraftSync";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { ScreenRequestScope } from "@/shared/api/screenRequests";
import { type MealTime, type MealType, MENU_INPUT_MODE } from "@/shared/api/types/api.dto";
import type { RegisterMealRequestDto } from "@/shared/api/types/api.request.dto";

interface RegisterMealParams {
  dateKey: string;
  mealTime: MealType;
  menus: {
    id: number;
    quantity: number;
    mode: "unit" | "weight";
  }[];
  image?: string;
  screen: ScreenRequestScope;
}

export function useRegisterChatMealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dateKey, mealTime, menus, image, screen }: RegisterMealParams) =>
      screen.run(async () => {
        if (menus.length === 0) {
          throw new Error("기록할 메뉴가 없어요.");
        }

        if (menus.some((menu) => !Number.isFinite(menu.quantity) || menu.quantity <= 0)) {
          throw new Error("메뉴의 섭취량을 확인해 주세요.");
        }

        // 선택한 시간대에 이미 기록된 메뉴를 가져옵니다.
        const dayMeals = await queryClient.fetchQuery({
          queryKey: homeQueryKeys.dayMeals.byDate(dateKey),
          queryFn: () => getTodayMealRecordMenus(dateKey),
          staleTime: Infinity,
          retry: false,
        });

        screen.assertActive();

        const time = Number(mealTime) as MealTime;

        const mergedMenus = mergeMenuDraftMenus({
          baseMenus: dayMeals.menusByTime[time].map(toMenuDraftSeed),
          overrideMenus: menus,
        });

        if (mergedMenus.length > MAX_MEAL_RECORD_MENUS) {
          throw new Error(MEAL_RECORD_MENU_LIMIT_MESSAGE);
        }

        // 새 사진이 있으면 사용하고, 없으면 기존 사진을 유지합니다.
        const mealImage = image?.trim() || dayMeals.imagesByTime[time];

        const request: RegisterMealRequestDto = {
          date: dateKey,
          time,
          meal_time: dayMeals.mealRecordMealTimesByTime[time] ?? getCurrentMealRecordTime(),
          menu_ids: mergedMenus.map((menu) => menu.id),
          menu_quantities: mergedMenus.map((menu) => menu.quantity),
          menu_input_modes: mergedMenus.map((menu) =>
            menu.mode === "unit" ? MENU_INPUT_MODE.UNIT : MENU_INPUT_MODE.WEIGHT,
          ),
          ...(mealImage ? { image: mealImage } : {}),
        };

        screen.assertActive();

        return postTodayMealRecordRegister(request);
      }),

    retry: false,

    onSuccess: async (_response, { dateKey }) => {
      await Promise.all([
        // 저장한 날짜의 식사 기록 갱신
        queryClient.invalidateQueries({
          queryKey: homeQueryKeys.dayMeals.byDate(dateKey),
          exact: true,
        }),

        // 달력의 식사 기록 표시 갱신
        queryClient.invalidateQueries({
          queryKey: calendarQueryKeys.recordedDates.all,
        }),
      ]);
    },

    onError: async (error, { dateKey }) => {
      if (isRequestAbortError(error)) return;

      await queryClient.invalidateQueries({
        queryKey: homeQueryKeys.dayMeals.byDate(dateKey),
        exact: true,
      });
    },
  });
}
