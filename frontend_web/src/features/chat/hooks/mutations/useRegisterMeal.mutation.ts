import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getTodayMealRecordMenus } from "@/features/home/api/todayRecord.api";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { postTodayMealRecordRegister } from "@/features/meal-record/api/DayMeal";
import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import { invalidateMealRecordRelatedQueries } from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import { mergeMenuDraftMenus } from "@/features/meal-record/stores/menuDraft.store";
import { getCurrentMealRecordTime } from "@/features/meal-record/utils/mealRecordTime";
import { toMenuDraftSeed } from "@/features/meal-record/utils/menuDraftSync";
import { trackMenuSave } from "@/shared/analytics/menuSaveEvent.util";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { ScreenRequestScope } from "@/shared/api/screenRequests";
import { type MealTime, type MealType, MENU_INPUT_MODE } from "@/shared/api/types/api.dto";
import type { RegisterMealRequestDto } from "@/shared/api/types/api.request.dto";

interface RegisterMealParams {
  dateKey: string;
  mealTime: MealType;
  menus: {
    id: number;
    name?: string;
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
          throw new Error("음식의 섭취량을 확인해주세요");
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

        const baseMenus = dayMeals.menusByTime[time].map(toMenuDraftSeed);
        const mergedMenus = mergeMenuDraftMenus({ baseMenus, overrideMenus: menus });

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

        const response = await postTodayMealRecordRegister(request);
        trackMenuSave({
          source: "chat",
          menus: mergedMenus.map((menu) => ({ menu_id: menu.id, menu_name: menu.name })),
          isEdit: baseMenus.length > 0,
        });
        return response;
      }),

    retry: false,

    onSuccess: async (_response, { dateKey }) => {
      await invalidateMealRecordRelatedQueries(queryClient, dateKey);
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
