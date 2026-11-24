import { useState } from "react";

import { OptionCard } from "@/features/sign-up/components/OptionCard";
import { StepLayout } from "@/features/sign-up/components/StepLayout";
import styles from "@/features/sign-up/styles/SignUpSteps.module.css";
import { type SignUpStepProps,SOCIAL } from "@/features/sign-up/types/signUp.type";

const ACQUISITION_CHANNEL_OPTIONS = [
  { value: SOCIAL.INSTAGRAM, title: "인스타그램" },
  { value: SOCIAL.NAVER_CAFE, title: "네이버 카페" },
  { value: SOCIAL.APP_STORE, title: "앱스토어 / 플레이스토어 검색" },
  { value: SOCIAL.REFERRAL, title: "지인 추천" },
  { value: SOCIAL.ETC, title: "기타" },
] as const;

// screen: ONB-01-016
export function AcquisitionChannelStep({
  form,
  onNext,
  nextLabel,
}: SignUpStepProps<"acquisitionChannel">) {
  const [channel, setChannel] = useState(form.acquisition_channel);

  return (
    <StepLayout
      title="멜로(Melo)를 어떻게 알게 되셨나요?"
      canGoNext={channel !== undefined}
      onNext={() => onNext({ acquisition_channel: channel })}
      nextLabel={nextLabel}
    >
      <div className={styles.optionList}>
        {ACQUISITION_CHANNEL_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            selected={channel === option.value}
            onSelect={() => setChannel(option.value)}
          />
        ))}
      </div>
    </StepLayout>
  );
}
