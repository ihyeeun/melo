import { create } from "zustand";

import type { ChatMealRecordMenu } from "@/features/chat/components/ChatMealRecordBottomSheet";
import type { SelectedDiaryMealRecordMenu } from "@/features/chat/utils/chatDiaryMealRecord";
import type { DayMealSummary } from "@/features/home/utils/dayMealSummary";
import { DEFAULT_MEAL_TYPE, type MealTime, type MealType } from "@/shared/api/types/api.dto";

export type ChatMealRecordSnapshot = {
  time: MealTime;
  menus: SelectedDiaryMealRecordMenu[];
};

export type ChatMealRecordEditSheetContext = {
  dateKey: string;
  dayMeals: DayMealSummary;
  image?: string;
  menus: ChatMealRecordMenu[];
  previousMealRecord: ChatMealRecordSnapshot;
};

type OpenChatMealRecordEditSheetParams = {
  context: ChatMealRecordEditSheetContext;
  mealType: MealType;
};

type ChatMealRecordEditSheetStoreState = {
  context: ChatMealRecordEditSheetContext | null;
  mealType: MealType;
  open: (params: OpenChatMealRecordEditSheetParams) => void;
  close: () => void;
  setMealType: (mealType: MealType) => void;
};

const useChatMealRecordEditSheetStore = create<ChatMealRecordEditSheetStoreState>((set) => ({
  context: null,
  mealType: DEFAULT_MEAL_TYPE,
  open: ({ context, mealType }) => {
    set({
      context,
      mealType,
    });
  },
  close: () => {
    set({ context: null });
  },
  setMealType: (mealType) => {
    set({ mealType });
  },
}));

export const useChatMealRecordEditSheetContext = () =>
  useChatMealRecordEditSheetStore((state) => state.context);

export const useChatMealRecordEditSheetMealType = () =>
  useChatMealRecordEditSheetStore((state) => state.mealType);

export const useOpenChatMealRecordEditSheet = () =>
  useChatMealRecordEditSheetStore((state) => state.open);

export const useCloseChatMealRecordEditSheet = () =>
  useChatMealRecordEditSheetStore((state) => state.close);

export const useSetChatMealRecordEditSheetMealType = () =>
  useChatMealRecordEditSheetStore((state) => state.setMealType);
