import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

import { MENSTRUAL_PHASE_SETTING_STORAGE_KEY } from "@/features/personal-analysis/constants/personalAnalysis.constant";

type MenstrualPhaseSettingState = {
  isVisible: boolean;
  actions: {
    setVisible: (isVisible: boolean) => void;
  };
};

// 분석 그래프의 생리 주기 배경. 기본은 끄고, 상단 토글로 켠 상태는 기기에 기억한다
const useMenstrualPhaseSettingStore = create<MenstrualPhaseSettingState>()(
  devtools(
    persist(
      (set) => ({
        isVisible: false,
        actions: {
          setVisible: (isVisible) => set({ isVisible }, false, "menstrualPhase/setVisible"),
        },
      }),
      {
        name: MENSTRUAL_PHASE_SETTING_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ isVisible: state.isVisible }),
      },
    ),
    { name: "MenstrualPhaseSettingStore" },
  ),
);

export const useIsMenstrualPhaseVisible = () =>
  useMenstrualPhaseSettingStore((state) => state.isVisible);
export const useSetMenstrualPhaseVisible = () =>
  useMenstrualPhaseSettingStore((state) => state.actions.setVisible);
