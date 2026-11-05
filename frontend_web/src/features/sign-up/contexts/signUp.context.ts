import { createContext, useContext } from "react";

import type { SignUpType } from "@/features/sign-up/types/signUp.type";

export interface SignUpContextType {
  form: Partial<SignUpType>;
  update: (patch: Partial<SignUpType>) => void;
  stepIndex: number;
  goNext: () => void;
  goPrev: () => void;
}

export const SignUpContext = createContext<SignUpContextType | null>(null);

export function useSignUpContext() {
  const context = useContext(SignUpContext);

  if (!context) throw new Error("useSignUpContext must be used within a SignUpProvider");

  return context;
}
