import {
  getTargetCaloriesFeedback,
  GOAL_CALORIES_MAX,
  GOAL_CALORIES_MIN,
} from "@/features/profile/goalEdit.model";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import { useRecommendedCaloriesQuery } from "@/features/sign-up/hooks/queries/useRecommendedCalories.query";
import { useRecommendedDraft } from "@/features/sign-up/hooks/useRecommendedDraft";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";
import { NumberInput } from "@/shared/commons/input/NumberInput";
import { toast } from "@/shared/commons/toast/toast";

// screen: ONB-01-008
export function TargetCaloriesStep({ form, onNext, nextLabel }: SignUpStepProps<"targetCalories">) {
  const recommendation = useRecommendedCaloriesQuery(form);
  const [calories, setCalories] = useRecommendedDraft(form.target_calories, recommendation.data);
  const feedback = getTargetCaloriesFeedback(form, calories);

  const recommendationMessage = recommendation.isError
    ? "추천 칼로리를 불러오지 못했어요. 직접 입력해주세요."
    : recommendation.data === undefined
      ? "추천 칼로리를 계산하고 있어요"
      : `추천하는 목표 칼로리는 ${recommendation.data.toLocaleString("ko-KR")}kcal예요`;

  return (
    <StepLayout
      title="하루 목표 칼로리를 설정해주세요"
      description={recommendationMessage}
      canGoNext={calories !== undefined}
      onNext={() => {
        // 목표 몸무게와 맞지 않는 칼로리는 [다음]을 누를 때 알려 주고 화면에 남는다
        if (!feedback.isValid) {
          toast.warning(feedback.message, feedback.detail);
          return;
        }
        onNext({ target_calories: calories });
      }}
      nextLabel={nextLabel}
    >
      <NumberInput
        value={calories}
        onChange={(nextCalories) => {
          // 0으로 시작하거나 최댓값을 넘는 입력은 받지 않는다
          if (
            nextCalories !== undefined &&
            (nextCalories < GOAL_CALORIES_MIN || nextCalories > GOAL_CALORIES_MAX)
          ) {
            return;
          }
          setCalories(nextCalories === undefined ? undefined : Math.trunc(nextCalories));
        }}
        placeholder="0000"
        min={GOAL_CALORIES_MIN}
        max={GOAL_CALORIES_MAX}
        step={1}
        inputMode="numeric"
        unit="kcal"
        normalizeOnBlur={false}
      />

      <p className={`${styles.helperText} body-l-regular text-secondary`}>
        {feedback.message}
      </p>
    </StepLayout>
  );
}
