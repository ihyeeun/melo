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

// screen: ONB-01-008
export function TargetCaloriesStep({ form, onNext, nextLabel }: SignUpStepProps<"targetCalories">) {
  const recommendation = useRecommendedCaloriesQuery(form);
  const [calories, setCalories] = useRecommendedDraft(form.target_calories, recommendation.data);
  const feedback = getTargetCaloriesFeedback(form, calories);

  const recommendationMessage = recommendation.isError
    ? "추천 칼로리를 불러오지 못했어요. 직접 입력해주세요"
    : recommendation.data === undefined
      ? "추천 칼로리를 계산하고 있어요"
      : `추천하는 목표 칼로리는 ${recommendation.data}kcal예요`;

  return (
    <StepLayout
      title="하루 목표 칼로리를 설정해주세요"
      description={recommendationMessage}
      canGoNext={feedback.isValid}
      onNext={() => onNext({ target_calories: calories })}
      nextLabel={nextLabel}
    >
      <NumberInput
        value={calories}
        onChange={(nextCalories) => {
          if (nextCalories !== undefined && nextCalories > GOAL_CALORIES_MAX) return;
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
        {feedback.detail ? `${feedback.message}\n${feedback.detail}` : feedback.message}
      </p>
    </StepLayout>
  );
}
