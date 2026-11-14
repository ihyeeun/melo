import { useState } from "react";

import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import { PERSONA, type SignUpStepProps } from "@/features/sign-up/types/signUp.type";

const PERSONA_OPTIONS = [
  { value: PERSONA.SEARCHER, title: "음식의 칼로리·영양성분을 직접 검색해요" },
  { value: PERSONA.ROUTINE, title: "정해둔 음식(샐러드 등)만 반복해서 먹어요" },
  { value: PERSONA.CASUAL, title: "덜 부담스러워 보이는 음식을 감으로 골라요" },
  { value: PERSONA.ETC, title: "기타" },
] as const;

export function PersonaTypeStep({ form, onNext, nextLabel }: SignUpStepProps<"persona">) {
  const [personaType, setPersonaType] = useState(form.persona_type);

  return (
    <StepLayout
      title={"건강하게 먹으려 할 때,\n가장 자주 하는 행동은 무엇인가요?"}
      canGoNext={personaType !== undefined}
      onNext={() => onNext({ persona_type: personaType })}
      nextLabel={nextLabel}
    >
      <div className={styles.optionList}>
        {PERSONA_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            selected={personaType === option.value}
            onSelect={() => setPersonaType(option.value)}
          />
        ))}
      </div>
    </StepLayout>
  );
}
