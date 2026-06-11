import { getMealTypeFromCurrentTime } from "@/features/chat/utils/chatMeal";
import type { DayMealSummary, MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import {
  type ChatHistoryItemResponseDto,
  type MealServingInputMode,
  type MealTime,
  type MealType,
  MENU_INPUT_MODE,
  type RegisterMealRequestDto,
} from "@/shared/api/types/api.dto";
import { formatDateKey, getTodayFormatDateKey, parseDate } from "@/shared/utils/dateFormat";

export type SelectedDiaryMealRecordMenu = {
  id: number;
  quantity: number;
  mode: MealServingInputMode;
};

export type DiaryMealRecordSelection = {
  time: MealTime;
  menus: SelectedDiaryMealRecordMenu[];
};

type DiaryMealRecordCandidateMenu = {
  menu_id: number;
  weight: number;
};

const MEAL_TIME_LIST: MealTime[] = [0, 1, 2, 3, 4];

export function getChatDateKey(chatItem: Pick<ChatHistoryItemResponseDto, "createdAt">) {
  const chatDate = parseDate(chatItem.createdAt);
  return chatDate ? formatDateKey(chatDate) : getTodayFormatDateKey();
}

export function getCurrentMealTime() {
  return Number(getMealTypeFromCurrentTime(new Date())) as MealTime;
}

// 다이어리에 기록되어있는 메뉴들을 다시 저장할 수 있도록 ids, quantities, modes 형태를 뽑아 바꾸는 함수
export function getSelectedDiaryMenusByTime(dayMeals: DayMealSummary, mealTime: MealTime) {
  return dayMeals.menusByTime?.[mealTime]?.map(toSelectedDiaryMealRecordMenu) ?? [];
}

// 채팅 결과에 나온 메뉴가 다이어리 기록에 있는지 찾는 함수 (기록, 수정하기 버튼)
export function getDiaryMealRecordSelectionByMenuIds(
  dayMeals: DayMealSummary | undefined,
  menuIds: number[],
  mealTime?: MealTime,
): DiaryMealRecordSelection | null {
  if (!dayMeals || menuIds.length === 0) {
    return null;
  }

  const targetIdSet = new Set(menuIds);
  const mealTimes = mealTime === undefined ? MEAL_TIME_LIST : [mealTime];

  for (const targetMealTime of mealTimes) {
    const selectedMenus = (dayMeals.menusByTime?.[targetMealTime] ?? [])
      .filter((menu) => targetIdSet.has(menu.id))
      .map(toSelectedDiaryMealRecordMenu);

    if (selectedMenus.length > 0) {
      return {
        time: targetMealTime,
        menus: selectedMenus,
      };
    }
  }

  return null;
}

// 다이어리에 기록되어있는 메뉴(담기, 수정하기 버튼)
export function getDiaryMealMenuSelection(
  dayMeals: DayMealSummary | undefined,
  menuId: number,
  mealTime?: MealTime,
): { time: MealTime; menu: SelectedDiaryMealRecordMenu } | null {
  if (!dayMeals) {
    return null;
  }

  const mealTimes = mealTime === undefined ? MEAL_TIME_LIST : [mealTime];

  for (const targetMealTime of mealTimes) {
    const menu = dayMeals.menusByTime?.[targetMealTime]?.find((item) => item.id === menuId);

    if (menu) {
      return {
        time: targetMealTime,
        menu: toSelectedDiaryMealRecordMenu(menu),
      };
    }
  }

  return null;
}

// 저장 요청을 만들 때 기존 다이어리 메뉴와 새 선택 메뉴를 합침(포함되어있던 메뉴는 새롭게 추가한 값으로 덮어쓰도록)
export function getNextDiaryMenusByCandidateIds({
  dayMeals,
  time,
  selectedMenus,
  candidateIds,
}: {
  dayMeals: DayMealSummary;
  time: MealTime;
  selectedMenus: SelectedDiaryMealRecordMenu[];
  candidateIds: number[];
}) {
  const candidateIdSet = new Set(candidateIds);
  const preservedMenus = getSelectedDiaryMenusByTime(dayMeals, time).filter(
    (menu) => !candidateIdSet.has(menu.id),
  );

  return mergeSelectedDiaryMenus(preservedMenus, selectedMenus);
}

export function getSelectedDiaryMenusFromCandidateMenus(
  menus: DiaryMealRecordCandidateMenu[],
): SelectedDiaryMealRecordMenu[] {
  const latestMenusById = new Map<number, DiaryMealRecordCandidateMenu>();

  menus.forEach((menu) => {
    latestMenusById.set(menu.menu_id, menu);
  });

  return mergeSelectedDiaryMenus(
    [],
    [...latestMenusById.values()].map((menu) => ({
      id: menu.menu_id,
      quantity: menu.weight,
      mode: "unit",
    })),
  );
}

export function getDiaryMealImage(dayMeals: DayMealSummary, mealTime: MealTime) {
  const image = dayMeals.imagesByTime?.[mealTime];
  return typeof image === "string" && image.trim().length > 0 ? image : undefined;
}

// registerMeal 요청 형태로 변환
export function buildDiaryMealRecordRequest({
  dateKey,
  mealType,
  selectedMenus,
  image,
}: {
  dateKey: string;
  mealType: MealType;
  selectedMenus: SelectedDiaryMealRecordMenu[];
  image?: string;
}): RegisterMealRequestDto {
  return {
    date: dateKey,
    time: Number(mealType) as MealTime,
    menu_ids: selectedMenus.map((menu) => menu.id),
    menu_quantities: selectedMenus.map((menu) => menu.quantity),
    menu_input_modes: selectedMenus.map((menu) =>
      menu.mode === "weight" ? MENU_INPUT_MODE.WEIGHT : MENU_INPUT_MODE.UNIT,
    ),
    ...(image ? { image } : {}),
  };
}

function toSelectedDiaryMealRecordMenu(menu: MenuWithQuantity): SelectedDiaryMealRecordMenu {
  return {
    id: menu.id,
    quantity: menu.quantity,
    mode: menu.serving_input_mode,
  };
}

function mergeSelectedDiaryMenus(
  baseMenus: SelectedDiaryMealRecordMenu[],
  overrideMenus: SelectedDiaryMealRecordMenu[],
) {
  const menuById = new Map<number, SelectedDiaryMealRecordMenu>();

  baseMenus.forEach((menu) => {
    menuById.set(menu.id, menu);
  });

  overrideMenus.forEach((menu) => {
    menuById.set(menu.id, menu);
  });

  return [...menuById.values()];
}
