import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import { SubCodeInputSection } from "@/features/sub-code/components/SubCodeInputSection";

export default function StepSubscribedCode({ data, update }: StepComponentProps) {
  return (
    <SubCodeInputSection value={data.subCode ?? ""} onChange={(subCode) => update({ subCode })} />
  );
}
