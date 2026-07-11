import { useMemo, useState } from "react";

import { type StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { ScrollWheelPicker } from "@/shared/commons/picker/ScrollWheelPicker";
import {
  getBirthYearRange,
  isValidBirthYear,
  makeYearOptions,
} from "@/shared/commons/picker/yearOptions";

export default function StepGender({ data, update }: StepComponentProps) {
  const [isBirthYearSheetOpen, setIsBirthYearSheetOpen] = useState(false);
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
  const [draftBirthYear, setDraftBirthYear] = useState(visibleBirthYear);

  const openBirthYearSheet = () => {
    setDraftBirthYear(visibleBirthYear);
    setIsBirthYearSheetOpen(true);
  };

  const confirmBirthYear = () => {
    update({ birthYear: draftBirthYear });
    setIsBirthYearSheetOpen(false);
  };

  return (
    <section className={`${styles.content} ${styles.onboardingStepReadable}`}>
      <div className={styles.onboardingTitle}>
        <h2 className="typo-title1">성별 / 출생 연도를 알려주세요</h2>
      </div>

      <div className={styles.onboardingGenderGroup}>
        <p className={`${styles.textNormal} typo-title3`}>성별</p>
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
        <p className={`${styles.textNormal} typo-title3`}>출생 연도</p>
        <button
          type="button"
          className={styles.onboardingBirthYearTrigger}
          onClick={openBirthYearSheet}
        >
          <span
            className={`${hasSelectedBirthYear ? styles.textNormal : styles.textAssistive} typo-h1`}
          >
            {visibleBirthYear} 년
          </span>{" "}
        </button>
      </div>

      <BottomSheet
        isOpen={isBirthYearSheetOpen}
        onClose={() => setIsBirthYearSheetOpen(false)}
        disableContentDrag
      >
        <div className={styles.onboardingBirthYearSheet}>
          <h3 className="typo-title2">출생 연도</h3>
          <div className={styles.onboardingBirthYearPicker}>
            <ScrollWheelPicker
              height={400}
              highlightHeight={72}
              itemHeight={80}
              classNames={{
                item: `typo-h1 ${styles.onboardingBirthYearPickerItem}`,
                itemSelected: `typo-h1 ${styles.onboardingBirthYearPickerItemSelected}`,
                highlight: styles.onboardingBirthYearPickerHighlight,
              }}
              columns={[
                {
                  key: "birthYear",
                  value: String(draftBirthYear),
                  options: birthYearOptions,
                  renderOption: (value) => `${value} 년`,
                  ariaLabel: "출생 연도 선택",
                },
              ]}
              onChange={(_, value) => setDraftBirthYear(Number(value))}
            />
          </div>
          <Button fullWidth size="large" onClick={confirmBirthYear}>
            확인
          </Button>
        </div>
      </BottomSheet>
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
      <p className="typo-label2">{label}</p>
    </button>
  );
}
