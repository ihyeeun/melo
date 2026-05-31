import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { registerWeight } from "@/features/home/api/health";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/queryKey";
import {
  updateActivity,
  updateBirthYear,
  updateGender,
  updateGoal,
  updateHeight,
  updateTargetCalories,
  updateTargetRatio,
  updateTargetWeight,
  updateWeight,
} from "@/features/profile/api/profile";
import GoalEditNutrientStep from "@/features/profile/components/GoalEditNutrientStep";
import {
  hasNutrientTotal,
  isRatioChanged,
  toUpdatedProfile,
  validateStartPlan,
} from "@/features/profile/goalEdit.model";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import styles from "@/features/profile/styles/GoalEditPage.module.css";
import { PATH } from "@/router/path";
import { identifyUserProperties } from "@/shared/analytics/analytics";
import {
  trackUserProfileUpdated,
  type UserProfileUpdatedField,
} from "@/shared/analytics/userProfileEvents";
import type { ProfileResponseDto, WeightStepsResponseDto } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import { toast } from "@/shared/commons/toast/toast";
import { resetStackflow, useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSetTargets } from "@/shared/stores/targetNutrient.store";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

import {
  useEnsureGoalEditFlow,
  useFinishGoalEditFlow,
  useGoalEditDraft,
  useGoalEditHasActiveFlow,
  useGoalEditInitialDraft,
  useUpdateGoalEditDraft,
} from "./stores/goalEditFlow.store";

export default function GoalEditNutrientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setTargets = useSetTargets();
  const { data: profile, isPending } = useGetProfileQuery();
  const draft = useGoalEditDraft();
  const hasActiveFlow = useGoalEditHasActiveFlow();
  const initialDraft = useGoalEditInitialDraft();
  const ensureGoalEditFlow = useEnsureGoalEditFlow();
  const finishGoalEditFlow = useFinishGoalEditFlow();
  const updateDraft = useUpdateGoalEditDraft();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNutrientTotalModalOpen, setIsNutrientTotalModalOpen] = useState(false);
  const visibleDraft = hasActiveFlow || isSubmitting ? draft : null;

  useEffect(() => {
    if (!profile) {
      return;
    }

    ensureGoalEditFlow(profile);
  }, [ensureGoalEditFlow, profile]);

  const handleBack = () => {
    if (isSubmitting) return;
    navigate(-1);
  };

  const handleComplete = async () => {
    if (!visibleDraft || !initialDraft) {
      return;
    }

    const errorMessage = validateStartPlan(visibleDraft);
    if (errorMessage) {
      toast.warning(errorMessage);
      return;
    }

    if (visibleDraft.target_calories === undefined) {
      toast.warning("목표 칼로리를 입력해주세요");
      return;
    }

    if (!hasNutrientTotal(visibleDraft)) {
      setIsNutrientTotalModalOpen(true);
      return;
    }

    const today = getTodayFormatDateKey();
    const updateTasks: Array<() => Promise<ProfileResponseDto>> = [];
    const updatedFields: UserProfileUpdatedField[] = [];

    if (visibleDraft.gender !== undefined && visibleDraft.gender !== initialDraft.gender) {
      updateTasks.push(() => updateGender(visibleDraft.gender!));
      updatedFields.push("gender");
    }

    if (visibleDraft.birthYear !== undefined && visibleDraft.birthYear !== initialDraft.birthYear) {
      updateTasks.push(() => updateBirthYear(visibleDraft.birthYear!));
      updatedFields.push("birth_year");
    }

    if (visibleDraft.height !== undefined && visibleDraft.height !== initialDraft.height) {
      updateTasks.push(() => updateHeight(visibleDraft.height!));
      updatedFields.push("height_cm");
    }

    if (visibleDraft.weight !== undefined && visibleDraft.weight !== initialDraft.weight) {
      updateTasks.push(async () => {
        const nextWeight = visibleDraft.weight!;
        const previousWeight = initialDraft.weight;
        const updatedProfile = await updateWeight(nextWeight);

        try {
          await registerWeight({ date: today, weight: nextWeight });
        } catch (error) {
          console.error("Failed to register updated weight", error);

          if (previousWeight !== undefined) {
            try {
              await updateWeight(previousWeight);
            } catch (rollbackError) {
              console.error("Failed to rollback profile weight", rollbackError);
            }
          }

          throw error;
        }

        queryClient.setQueryData<WeightStepsResponseDto>(
          homeQueryKeys.bodyStats(today),
          (previous) => ({
            weight: nextWeight,
            steps: previous?.steps ?? 0,
          }),
        );

        return updatedProfile;
      });
      updatedFields.push("weight_kg");
    }

    if (visibleDraft.activity !== undefined && visibleDraft.activity !== initialDraft.activity) {
      updateTasks.push(() => updateActivity(visibleDraft.activity!));
      updatedFields.push("activity_level");
    }

    if (visibleDraft.goal !== undefined && visibleDraft.goal !== initialDraft.goal) {
      updateTasks.push(() => updateGoal(visibleDraft.goal!));
      updatedFields.push("health_goal");
    }

    if (
      visibleDraft.target_weight !== undefined &&
      visibleDraft.target_weight !== initialDraft.target_weight
    ) {
      updateTasks.push(() => updateTargetWeight(visibleDraft.target_weight!));
      updatedFields.push("goal_weight_kg");
    }

    if (
      visibleDraft.target_calories !== undefined &&
      visibleDraft.target_calories !== initialDraft.target_calories
    ) {
      updateTasks.push(() => updateTargetCalories(visibleDraft.target_calories!));
      updatedFields.push("daily_calorie_target");
    }

    if (isRatioChanged(initialDraft, visibleDraft)) {
      updateTasks.push(() =>
        updateTargetRatio([visibleDraft.carbs!, visibleDraft.protein!, visibleDraft.fat!]),
      );
      updatedFields.push("goal_carb_pct", "goal_protein_pct", "goal_fat_pct");
    }

    if (updateTasks.length === 0) {
      toast.warning("변경된 내용이 없어요");
      return;
    }

    try {
      setIsSubmitting(true);

      await Promise.all(updateTasks.map((task) => task()));

      queryClient.setQueryData<ProfileResponseDto>(queryKeys.profile, (previous) => {
        if (!previous) {
          return previous;
        }

        return toUpdatedProfile(previous, visibleDraft);
      });
      if (profile) {
        identifyUserProperties(toUpdatedProfile(profile, visibleDraft));
      }
      trackUserProfileUpdated(updatedFields);

      setTargets({
        target_calories: visibleDraft.target_calories!,
        target_ratio: [visibleDraft.carbs!, visibleDraft.protein!, visibleDraft.fat!],
      });

      toast.success("목표가 수정되었어요");
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile,
      });
      finishGoalEditFlow();

      resetStackflow(PATH.PROFILE, {
        animate: false,
      });
    } catch (error) {
      console.error(error);
      toast.warning("목표 수정에 실패했어요");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${styles.page} ${styles.pageWhite}`}>
      <PageHeader onBack={handleBack} />

      <main className={styles.main}>
        {isPending && !visibleDraft && (
          <p className={styles.loadingText}>프로필 목표 정보를 불러오는 중입니다.</p>
        )}
        {!isPending && !visibleDraft && (
          <p className={styles.loadingText}>프로필을 불러오지 못했어요</p>
        )}

        {visibleDraft && (
          <section className={styles.stageSection}>
            <GoalEditNutrientStep data={visibleDraft} update={updateDraft} />
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <Button
          onClick={handleComplete}
          disabled={!visibleDraft || isSubmitting}
          fullWidth
          variant="filled"
          size="large"
          interaction={!visibleDraft || isSubmitting ? "disable" : "normal"}
        >
          {isSubmitting ? "완료 중..." : "완료"}
        </Button>
      </footer>

      <CheckButtonModal
        open={isNutrientTotalModalOpen}
        onOpenChange={setIsNutrientTotalModalOpen}
        title="영양소 비율 확인"
        description="탄단지 비율의 합을 100으로 맞춰주세요"
      />
    </div>
  );
}
