import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { OnboardingData } from "@/features/onboarding/onboarding.types";
import { type GoalEditDraft, toGoalEditDraft } from "@/features/profile/goalEdit.model";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";

type GoalEditFlowState = {
  draft: GoalEditDraft | null;
  hasActiveFlow: boolean;
  initialDraft: GoalEditDraft | null;
  actions: {
    finish: () => void;
    startFromProfile: (profile: ProfileResponseDto) => void;
    ensureFromProfile: (profile: ProfileResponseDto) => void;
    updateDraft: (patch: Partial<OnboardingData>) => void;
  };
};

export const useGoalEditFlowStore = create<GoalEditFlowState>()(
  devtools(
    (set, get) => ({
      draft: null,
      hasActiveFlow: false,
      initialDraft: null,
      actions: {
        finish: () => {
          set({ hasActiveFlow: false, draft: null, initialDraft: null }, false, "goalEdit/finish");
        },
        startFromProfile: (profile) => {
          const nextDraft = toGoalEditDraft(profile);
          set(
            {
              draft: nextDraft,
              hasActiveFlow: true,
              initialDraft: nextDraft,
            },
            false,
            "goalEdit/startFromProfile",
          );
        },
        ensureFromProfile: (profile) => {
          const { draft, hasActiveFlow, initialDraft } = get();

          if (hasActiveFlow && draft && initialDraft) {
            return;
          }

          const nextDraft = toGoalEditDraft(profile);
          set(
            {
              draft: nextDraft,
              hasActiveFlow: true,
              initialDraft: nextDraft,
            },
            false,
            "goalEdit/ensureFromProfile",
          );
        },
        updateDraft: (patch) =>
          set(
            (state) => ({
              draft: state.draft ? { ...state.draft, ...patch } : state.draft,
            }),
            false,
            "goalEdit/updateDraft",
          ),
      },
    }),
    { name: "GoalEditFlowStore" },
  ),
);

export const useGoalEditDraft = () => useGoalEditFlowStore((state) => state.draft);
export const useGoalEditHasActiveFlow = () => useGoalEditFlowStore((state) => state.hasActiveFlow);
export const useGoalEditInitialDraft = () => useGoalEditFlowStore((state) => state.initialDraft);
export const useFinishGoalEditFlow = () => useGoalEditFlowStore((state) => state.actions.finish);
export const useStartGoalEditFlow = () =>
  useGoalEditFlowStore((state) => state.actions.startFromProfile);
export const useEnsureGoalEditFlow = () =>
  useGoalEditFlowStore((state) => state.actions.ensureFromProfile);
export const useUpdateGoalEditDraft = () =>
  useGoalEditFlowStore((state) => state.actions.updateDraft);
