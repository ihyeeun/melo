import { useState } from "react";

import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import { StepTitle } from "@/features/sign-up/components/StepTitle";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import {
  JOB_TYPE,
  LUNCH_LOCATION,
  type SignUpStepProps,
} from "@/features/sign-up/types/signUp.type";

const JOB_OPTIONS = [
  { value: JOB_TYPE.OFFICE, label: "직장인" },
  { value: JOB_TYPE.FREELANCE, label: "프리랜서" },
  { value: JOB_TYPE.STUDENT, label: "학생" },
  { value: JOB_TYPE.ETC, label: "기타" },
] as const;

const LUNCH_LOCATION_OPTIONS = [
  { value: LUNCH_LOCATION.OUTSIDE, title: "회사 근처 식당·배달" },
  { value: LUNCH_LOCATION.INSIDE, title: "구내식당" },
  { value: LUNCH_LOCATION.BOX, title: "도시락 지참" },
  { value: LUNCH_LOCATION.HOME, title: "재택으로 집에서" },
  { value: LUNCH_LOCATION.ETC, title: "기타" },
] as const;

export function JobAndLunchStep({ form, onNext, nextLabel }: SignUpStepProps<"jobAndLunch">) {
  const [jobType, setJobType] = useState(form.job_type);
  const [lunchLocation, setLunchLocation] = useState(form.lunch_location ?? undefined);
  // 점심 장소는 직장인일 때만 묻는다
  const asksLunchLocation = jobType === JOB_TYPE.OFFICE;

  return (
    <StepLayout
      title="하는 일이 무엇인가요?"
      canGoNext={jobType !== undefined && (!asksLunchLocation || lunchLocation !== undefined)}
      onNext={() =>
        onNext({ job_type: jobType, lunch_location: asksLunchLocation ? lunchLocation : null })
      }
      nextLabel={nextLabel}
    >
      <div className={styles.chipGroup} data-step="job-type">
        {JOB_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.chip} body-l-medium`}
            aria-pressed={jobType === option.value}
            onClick={() => setJobType(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {asksLunchLocation ? (
        <>
          <StepTitle title="주로 어디서 점심을 드시나요?" />

          <div className={styles.optionList}>
            {LUNCH_LOCATION_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                title={option.title}
                selected={lunchLocation === option.value}
                onSelect={() => setLunchLocation(option.value)}
              />
            ))}
          </div>
        </>
      ) : null}
    </StepLayout>
  );
}
