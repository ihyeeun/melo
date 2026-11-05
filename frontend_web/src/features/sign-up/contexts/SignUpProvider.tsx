import { type ReactNode, useCallback, useMemo, useState } from "react";

import { SignUpContext } from "@/features/sign-up/contexts/signUp.context";
import type { SignUpType } from "@/features/sign-up/types/signUp.type";

type Props = {
  totalSteps: number;
  children: ReactNode;
};

export function SignUpProvider({ totalSteps, children }: Props) {
  const [form, setForm] = useState<Partial<SignUpType>>({});
  const [stepIndex, setStepIndex] = useState(0);

  const update = useCallback((patch: Partial<SignUpType>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const goPrev = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const value = useMemo(
    () => ({ form, update, stepIndex, goNext, goPrev }),
    [form, update, stepIndex, goNext, goPrev],
  );

  return <SignUpContext value={value}>{children}</SignUpContext>;
}
