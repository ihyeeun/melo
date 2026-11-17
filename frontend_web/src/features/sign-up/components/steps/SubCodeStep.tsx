import { Input } from "@base-ui/react/input";
import { useState } from "react";

import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import type { SignUpStepProps } from "@/features/sign-up/types/signUp.type";
import { MAX_SUB_CODE_LENGTH } from "@/features/sub-code/constants/subCode.constant";

// screen: ONB-01-017
export function SubCodeStep({ form, onNext, nextLabel }: SignUpStepProps<"subCode">) {
  const [subCode, setSubCode] = useState(form.subCode ?? "");

  return (
    <StepLayout
      title="구독 코드를 입력해주세요"
      canGoNext={subCode.trim() !== ""}
      onNext={() => onNext({ subCode: subCode.trim() })}
      nextLabel={nextLabel}
    >
      <Input
        autoFocus
        type="text"
        value={subCode}
        maxLength={MAX_SUB_CODE_LENGTH}
        onChange={(event) => setSubCode(event.target.value.slice(0, MAX_SUB_CODE_LENGTH))}
        placeholder="구독코드"
        aria-label="구독 코드"
        className={`${styles.textInput} title-xl-medium`}
      />
    </StepLayout>
  );
}
