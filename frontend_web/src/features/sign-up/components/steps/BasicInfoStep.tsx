import { useState } from "react";

import { BirthYearSheet } from "@/features/profile/components/BirthYearSheet";
import { GENDER_OPTIONS } from "@/features/profile/goalEdit.model";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { getBirthYearPickerStart, isValidBirthYear } from "@/shared/commons/picker/yearOptions";

// screen: ONB-01-003
export function BasicInfoStep({ form, onNext, nextLabel }: SignUpStepProps<"basicInfo">) {
  const [gender, setGender] = useState(form.gender);
  const [birthYear, setBirthYear] = useState(form.birthYear);
  const [isBirthYearSheetOpen, setIsBirthYearSheetOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(getBirthYearPickerStart);

  const openBirthYearSheet = () => {
    setPickerYear(getBirthYearPickerStart(birthYear));
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
            {birthYear ?? getBirthYearPickerStart()} 년
          </span>
        </button>
      </div>

      {/* screen: ONB-01-003_modal-birth */}
      <BirthYearSheet
        isOpen={isBirthYearSheetOpen}
        value={pickerYear}
        onChange={setPickerYear}
        onConfirm={confirmBirthYear}
        onClose={() => setIsBirthYearSheetOpen(false)}
      />
    </StepLayout>
  );
}
