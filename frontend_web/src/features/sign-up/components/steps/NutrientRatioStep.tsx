import { useState } from "react";

import { hasNutrientTotal } from "@/features/profile/goalEdit.model";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import { useRecommendedRatioQuery } from "@/features/sign-up/hooks/queries/useRecommendedRatio.query";
import { useRecommendedDraft } from "@/features/sign-up/hooks/useRecommendedDraft";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps, SignUpType } from "@/features/sign-up/types/signUp.type";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";

type Ratio = SignUpType["target_ratio"];

// target_ratio 배열 순서와 같다: [탄수화물, 단백질, 지방]
const NUTRIENTS = [
  { label: "탄수화물", energyPerGram: 4 },
  { label: "단백질", energyPerGram: 4 },
  { label: "지방", energyPerGram: 9 },
] as const;

const EMPTY_RATIO: Ratio = [0, 0, 0];
const NUTRIENT_INPUT_PATTERN = /^(?:100(?:\.0?)?|[0-9]{0,2}(?:\.[0-9]?)?)$/;

function formatRounded(value?: number) {
  return value === undefined ? "--" : Math.round(value).toString();
}

export function NutrientRatioStep({ form, onNext, nextLabel }: SignUpStepProps<"nutrient">) {
  const recommendation = useRecommendedRatioQuery(form);
  const [ratio, setRatio] = useRecommendedDraft(form.target_ratio, recommendation.data);
  const [isTotalModalOpen, setIsTotalModalOpen] = useState(false);
  const targetCalories = form.target_calories;

  // 추천값을 받기 전에는 0%로 보여준다
  const displayRatio = ratio ?? EMPTY_RATIO;
  const total = Math.round((displayRatio[0] + displayRatio[1] + displayRatio[2]) * 10) / 10;

  const changeRatio = (index: number, value?: number) => {
    const nextRatio: Ratio = [...displayRatio];
    nextRatio[index] = value ?? 0;
    setRatio(nextRatio);
  };

  // 합이 100%가 아니면 넘어가지 않고 안내한다
  const handleNext = () => {
    if (!hasNutrientTotal(ratio)) {
      setIsTotalModalOpen(true);
      return;
    }

    onNext({ target_ratio: ratio });
  };

  const description = recommendation.isPending
    ? "추천 비율을 계산하고 있어요"
    : recommendation.isError
      ? "추천 비율을 불러오지 못했어요. 직접 입력해주세요"
      : "원하는대로 비율을 수정할 수 있어요";

  return (
    <StepLayout
      title="추천하는 탄단지 비율이에요"
      description={description}
      canGoNext={ratio !== undefined}
      onNext={handleNext}
      nextLabel={nextLabel}
    >
      <div className={styles.macroCardGroup}>
        {NUTRIENTS.map(({ label, energyPerGram }, index) => {
          const kcal =
            targetCalories === undefined ? undefined : (targetCalories * displayRatio[index]) / 100;
          const gram = kcal === undefined ? undefined : kcal / energyPerGram;

          return (
            <div key={label} className={styles.macroCard}>
              <div className={styles.macroInfo}>
                <span className="title-s-semi text-primary">{label}</span>
                <div className={styles.macroAmount}>
                  <span className="body-s-regular text-secondary">{formatRounded(gram)} g</span>
                  <span className="body-s-regular text-secondary">{formatRounded(kcal)} kcal</span>
                </div>
              </div>

              <NumberField
                value={displayRatio[index]}
                onChange={(value) => changeRatio(index, value)}
                min={0}
                max={100}
                step={0.5}
                snapOnStep
                unit="%"
                isInputTextAllowed={(nextValue) => NUTRIENT_INPUT_PATTERN.test(nextValue)}
                unstyled
                inputProps={{ "aria-label": `${label} 비율` }}
                classNames={{
                  group: styles.macroInputArea,
                  decrement: styles.macroAdjustButton,
                  increment: styles.macroAdjustButton,
                  inputWrapper: styles.macroInputSection,
                  input: `${styles.macroInput} title-m-medium`,
                  unit: "title-m-medium text-primary",
                }}
                decrementIcon={<SystemIcon name="minus" size={18} />}
                incrementIcon={<SystemIcon name="plus" size={18} />}
              />
            </div>
          );
        })}

        <article className={styles.macroTotalCard}>
          <span className="body-l-medium text-tertiary">
            목표 칼로리 {targetCalories ?? "--"} kcal
          </span>
          <span className="title-s-semi text-primary marginLeft">총 {total}%</span>
        </article>
      </div>

      <CheckButtonModal
        open={isTotalModalOpen}
        onOpenChange={setIsTotalModalOpen}
        title="영양소 비율 확인"
        description="탄단지 비율의 합을 100%로 맞춰주세요"
      />
    </StepLayout>
  );
}
