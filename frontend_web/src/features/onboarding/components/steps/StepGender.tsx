import { useMemo } from "react";

import { type StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";
import {
  getBirthYearRange,
  isValidBirthYear,
  makeYearOptions,
} from "@/shared/commons/picker/yearOptions";

export default function StepGender({ data, update }: StepComponentProps) {
  const birthYearRange = useMemo(() => getBirthYearRange(), []);
  const defaultBirthYear = useMemo(
    () => Math.min(Math.max(2000, birthYearRange.min), birthYearRange.max),
    [birthYearRange.max, birthYearRange.min],
  );
  const birthYearOptions = useMemo(
    () =>
      makeYearOptions({
        from: birthYearRange.max,
        count: birthYearRange.max - birthYearRange.min + 1,
      }).map(String),
    [birthYearRange.max, birthYearRange.min],
  );
  const hasSelectedBirthYear = isValidBirthYear(data.birthYear);
  const visibleBirthYear = hasSelectedBirthYear ? data.birthYear : defaultBirthYear;

  const selectDefaultBirthYear = () => {
    if (!hasSelectedBirthYear) {
      update({ birthYear: defaultBirthYear });
    }
  };

  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={styles.onboardingTitle}>
        <h2 className="title-l-semi">성별 / 출생 연도를 알려주세요</h2>
      </div>

      <div className={styles.onboardingGenderGroup}>
        <p className={`${styles.textNormal} title-s-semi`}>성별</p>
        <div className={styles.onboardingGenderGrid}>
          <GenderCard
            label="남성"
            active={data.gender === 0}
            onClick={() => update({ gender: 0 })}
          />
          <GenderCard
            label="여성"
            active={data.gender === 1}
            onClick={() => update({ gender: 1 })}
          />
        </div>
      </div>

      <div className={styles.onboardingBirthYearGroup}>
        <p className={`${styles.textNormal} title-s-semi`}>출생 연도</p>
        <div className={styles.onboardingBirthYearTrigger}>
          <span
            className={`${hasSelectedBirthYear ? styles.textNormal : styles.textAssistive} title-xxl-semi`}
            aria-hidden="true"
          >
            {visibleBirthYear} 년
          </span>
          <select
            className={styles.onboardingBirthYearSelect}
            value={String(visibleBirthYear)}
            aria-label="출생 연도 선택"
            onFocus={selectDefaultBirthYear}
            onPointerDown={selectDefaultBirthYear}
            onChange={(event) => update({ birthYear: Number(event.target.value) })}
          >
            {birthYearOptions.map((year) => (
              <option key={year} value={year}>
                {year} 년
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

function GenderCard({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        styles.onboardingGenderChoiceButton,
        active ? styles.onboardingGenderChoiceButtonActive : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="body-l-semi">{label}</p>
    </button>
  );
}
