import { useState } from "react";

import { GENDER_OPTIONS } from "@/features/profile/goalEdit.model";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { ScrollWheelPicker } from "@/shared/commons/picker/ScrollWheelPicker";
import { getBirthYearRange, isValidBirthYear } from "@/shared/commons/picker/yearOptions";

const BIRTH_YEAR_RANGE = getBirthYearRange();
const DEFAULT_BIRTH_YEAR = Math.min(Math.max(2000, BIRTH_YEAR_RANGE.min), BIRTH_YEAR_RANGE.max);
const BIRTH_YEAR_OPTIONS = Array.from(
  { length: BIRTH_YEAR_RANGE.max - BIRTH_YEAR_RANGE.min + 1 },
  (_, index) => String(BIRTH_YEAR_RANGE.min + index),
);

export function BasicInfoStep({ form, onNext, nextLabel }: SignUpStepProps<"basicInfo">) {
  const [gender, setGender] = useState(form.gender);
  const [birthYear, setBirthYear] = useState(form.birthYear);
  const [isBirthYearSheetOpen, setIsBirthYearSheetOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(DEFAULT_BIRTH_YEAR);

  const openBirthYearSheet = () => {
    setPickerYear(birthYear ?? DEFAULT_BIRTH_YEAR);
    setIsBirthYearSheetOpen(true);
  };

  const confirmBirthYear = () => {
    setBirthYear(pickerYear);
    setIsBirthYearSheetOpen(false);
  };

  return (
    <StepLayout
      title="성별과 출생 연도를 알려주세요"
      canGoNext={gender !== undefined && isValidBirthYear(birthYear)}
      onNext={() => onNext({ gender, birthYear })}
      nextLabel={nextLabel}
    >
      <div className={styles.fieldGroup}>
        <p className="body-m-medium text-secondary">성별</p>
        <div className={styles.genderGrid}>
          {GENDER_OPTIONS.map((option) => (
            <SelectedCard
              key={option.value}
              isSelected={gender === option.value}
              setSelectedChange={() => setGender(option.value)}
              className={styles.genderCard}
            >
              <p className="body-l-medium text-primary textCenter">{option.label}</p>
            </SelectedCard>
          ))}
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <p className="body-m-medium text-secondary">출생 연도</p>
        <button
          type="button"
          className={`${styles.fieldBox} title-xl-medium`}
          onClick={openBirthYearSheet}
          aria-label="출생 연도 선택"
        >
          <span className={birthYear === undefined ? "text-disabled" : "text-primary"}>
            {birthYear ?? DEFAULT_BIRTH_YEAR} 년
          </span>
        </button>
      </div>

      <BottomSheet
        isOpen={isBirthYearSheetOpen}
        onClose={() => setIsBirthYearSheetOpen(false)}
        title="출생 연도"
        bodyClassName={styles.sheetBody}
        disableContentDrag
      >
        <div className={styles.sheetContent}>
          <ScrollWheelPicker
            height={260}
            itemHeight={52}
            classNames={{
              item: `title-l-semi ${styles.pickerItem}`,
              itemSelected: styles.pickerItemSelected,
              highlight: styles.pickerHighlight,
            }}
            columns={[
              {
                key: "birthYear",
                value: String(pickerYear),
                options: BIRTH_YEAR_OPTIONS,
                renderOption: (year) => `${year} 년`,
                ariaLabel: "출생 연도 선택",
              },
            ]}
            onChange={(_key, year) => setPickerYear(Number(year))}
          />

          <Button size="m" fullWidth onClick={confirmBirthYear}>
            확인
          </Button>
        </div>
      </BottomSheet>
    </StepLayout>
  );
}
