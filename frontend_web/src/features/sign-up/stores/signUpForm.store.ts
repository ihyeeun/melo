import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { SignUpForm, SignUpType } from "@/features/sign-up/types/signUp.type";

// 추천 목표 칼로리를 계산할 때 쓰이는 값
const TARGET_CALORIES_INPUT_KEYS = [
  "gender",
  "birthYear",
  "height",
  "weight",
  "activity",
  "goal",
  "target_weight",
] as const satisfies readonly (keyof SignUpType)[];

/**
 * 입력값을 반영하면서, 근거가 바뀐 추천값(목표 칼로리·탄단지 비율)은 비운다.
 * 비워진 값은 해당 단계에 다시 들어갔을 때 새 추천값으로 채워진다.
 */
function applySignUpPatch(prev: SignUpForm, patch: SignUpForm): SignUpForm {
  const next = { ...prev, ...patch };

  if (TARGET_CALORIES_INPUT_KEYS.some((key) => prev[key] !== next[key])) {
    return { ...next, target_calories: undefined, target_ratio: undefined };
  }

  if (prev.target_calories !== next.target_calories) {
    return { ...next, target_ratio: undefined };
  }

  return next;
}

// 단계마다 화면이 따로 쌓이므로, 단계 화면들이 함께 쓰는 입력값은 화면 밖에 둔다
type SignUpFormState = {
  form: SignUpForm;
  actions: {
    // 단계에서 입력한 값을 저장하고, 저장된 전체 값을 돌려준다
    save: (values: SignUpForm) => SignUpForm;
    reset: () => void;
  };
};

const useSignUpFormStore = create<SignUpFormState>()(
  devtools(
    (set, get) => ({
      form: {},
      actions: {
        save: (values) => {
          const form = applySignUpPatch(get().form, values);
          set({ form }, false, "signUp/save");
          return form;
        },
        reset: () => set({ form: {} }, false, "signUp/reset"),
      },
    }),
    { name: "SignUpFormStore" },
  ),
);

export const useSignUpForm = () => useSignUpFormStore((state) => state.form);
export const useSignUpFormActions = () => useSignUpFormStore((state) => state.actions);
