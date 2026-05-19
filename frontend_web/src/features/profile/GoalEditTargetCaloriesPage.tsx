import { useEffect } from "react";

import StepGoalCalories from "@/features/onboarding/components/steps/StepGoalCalories";
import {
  GOAL_CALORIES_MAX,
  GOAL_CALORIES_MIN,
} from "@/features/profile/goalEdit.model";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import styles from "@/features/profile/styles/GoalEditPage.module.css";
import { PATH } from "@/router/path";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import {
  useEnsureGoalEditFlow,
  useGoalEditDraft,
  useGoalEditHasActiveFlow,
  useUpdateGoalEditDraft,
} from "./stores/goalEditFlow.store";

export default function GoalEditTargetCaloriesPage() {
  const navigate = useNavigate();
  const { data: profile, isPending } = useGetProfileQuery();
  const draft = useGoalEditDraft();
  const hasActiveFlow = useGoalEditHasActiveFlow();
  const ensureGoalEditFlow = useEnsureGoalEditFlow();
  const updateDraft = useUpdateGoalEditDraft();
  const visibleDraft = hasActiveFlow ? draft : null;

  useEffect(() => {
    if (!profile) {
      return;
    }

    ensureGoalEditFlow(profile);
  }, [ensureGoalEditFlow, profile]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleGoNutrient = () => {
    if (!visibleDraft) return;

    if (
      visibleDraft.target_calories === undefined ||
      visibleDraft.target_calories < GOAL_CALORIES_MIN
    ) {
      toast.warning("목표 칼로리를 입력해주세요");
      return;
    }

    if (visibleDraft.target_calories > GOAL_CALORIES_MAX) {
      toast.warning("목표 칼로리는 1~99999 사이로 입력해주세요");
      return;
    }

    navigate(PATH.GOAL_EDIT_NUTRIENT);
  };

  return (
    <div className={`${styles.page} ${styles.pageWhite}`}>
      <PageHeader onBack={handleBack} />

      <main className={styles.main}>
        {isPending && !visibleDraft && (
          <p className={styles.loadingText}>프로필 목표 정보를 불러오는 중입니다.</p>
        )}
        {!isPending && !visibleDraft && <p className={styles.loadingText}>프로필을 불러오지 못했어요</p>}

        {visibleDraft && (
          <section className={styles.stageSection}>
            <StepGoalCalories data={visibleDraft} update={updateDraft} />
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <Button
          onClick={handleGoNutrient}
          disabled={!visibleDraft}
          fullWidth
          variant="filled"
          size="large"
          interaction={visibleDraft ? "normal" : "disable"}
        >
          다음
        </Button>
      </footer>
    </div>
  );
}
