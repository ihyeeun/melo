import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
  applyMaintainTargetWeight,
  getCaloriesRecommendationKey,
  getRatioRecommendationKey,
  type GoalEditDraft,
  toGoalEditDraft,
} from "@/features/profile/goalEdit.model";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";

// 지금 목표 칼로리 · 탄단지 비율이 어떤 입력값을 기준으로 정해졌는지.
// 계산에 들어가는 값이 이 기준과 달라졌을 때만 새 추천값으로 바꾼다
type RecommendationBasis = {
  calories: string | null;
  ratio: string | null;
};

const EMPTY_RECOMMENDATION_BASIS: RecommendationBasis = { calories: null, ratio: null };

// 저장된 목표 칼로리 · 비율은 저장된 입력값을 기준으로 정해진 값으로 본다
function getInitialRecommendationBasis(initialDraft: GoalEditDraft): RecommendationBasis {
  return {
    calories: getCaloriesRecommendationKey(initialDraft),
    ratio: getRatioRecommendationKey(initialDraft),
  };
}

type GoalEditFlowState = {
  draft: GoalEditDraft | null;
  hasActiveFlow: boolean;
  initialDraft: GoalEditDraft | null;
  recommendationBasis: RecommendationBasis;
  actions: {
    finish: () => void;
    startFromProfile: (profile: ProfileResponseDto) => void;
    ensureFromProfile: (profile: ProfileResponseDto) => void;
    updateDraft: (patch: Partial<GoalEditDraft>) => void;
    setRecommendationBasis: (patch: Partial<RecommendationBasis>) => void;
  };
};

export const useGoalEditFlowStore = create<GoalEditFlowState>()(
  devtools(
    (set, get) => ({
      draft: null,
      hasActiveFlow: false,
      initialDraft: null,
      recommendationBasis: EMPTY_RECOMMENDATION_BASIS,
      actions: {
        finish: () => {
          set(
            {
              hasActiveFlow: false,
              draft: null,
              initialDraft: null,
              recommendationBasis: EMPTY_RECOMMENDATION_BASIS,
            },
            false,
            "goalEdit/finish",
          );
        },
        startFromProfile: (profile) => {
          const initialDraft = toGoalEditDraft(profile);
          set(
            {
              // 체중 유지인데 저장된 목표 몸무게가 다르면 수정 값만 맞춘다. 처음 값은 그대로 둬야 저장할 때 바뀐 항목으로 잡힌다
              draft: applyMaintainTargetWeight(initialDraft),
              hasActiveFlow: true,
              initialDraft,
              recommendationBasis: getInitialRecommendationBasis(initialDraft),
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

          const nextInitialDraft = toGoalEditDraft(profile);
          set(
            {
              draft: applyMaintainTargetWeight(nextInitialDraft),
              hasActiveFlow: true,
              initialDraft: nextInitialDraft,
              recommendationBasis: getInitialRecommendationBasis(nextInitialDraft),
            },
            false,
            "goalEdit/ensureFromProfile",
          );
        },
        // 체중 유지면 목표 몸무게가 현재 몸무게를 따라간다(목표를 체중 유지로 바꿀 때, 체중 유지 중 몸무게를 바꿀 때)
        updateDraft: (patch) =>
          set(
            (state) => ({
              draft: state.draft
                ? applyMaintainTargetWeight({ ...state.draft, ...patch })
                : state.draft,
            }),
            false,
            "goalEdit/updateDraft",
          ),
        setRecommendationBasis: (patch) =>
          set(
            (state) => ({ recommendationBasis: { ...state.recommendationBasis, ...patch } }),
            false,
            "goalEdit/setRecommendationBasis",
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
export const useSetGoalEditRecommendationBasis = () =>
  useGoalEditFlowStore((state) => state.actions.setRecommendationBasis);
