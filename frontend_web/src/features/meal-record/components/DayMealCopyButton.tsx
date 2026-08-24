import type { ClipboardDayMeals } from "@/features/meal-record/utils/dayMealClipboard";
import { buildDayMealClipboardText } from "@/features/meal-record/utils/dayMealClipboard";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { toast } from "@/shared/commons/toast/toast";
import { copyTextToClipboard } from "@/shared/utils/clipboard";

import styles from "./DayMealCopyButton.module.css";

type DayMealCopyButtonProps = {
  dayMeals?: ClipboardDayMeals | null;
};

export function DayMealCopyButton({ dayMeals }: DayMealCopyButtonProps) {
  const clipboardText = dayMeals ? buildDayMealClipboardText(dayMeals) : "";

  if (!clipboardText) {
    return null;
  }

  const handleCopyDayMeals = async () => {
    try {
      await copyTextToClipboard(clipboardText);
      toast.success("하루 식단을 복사했어요");
    } catch {
      toast.error("식단을 복사하지 못했어요", "잠시 후 다시 시도해 주세요");
    }
  };

  return (
    <button
      type="button"
      className={styles.root}
      onClick={() => {
        void handleCopyDayMeals();
      }}
      aria-label="선택한 날짜의 식단 전체 복사"
    >
      <SystemIcon name="copy" size={14} />
      <span className="caption-m-regular">식단 복사</span>
    </button>
  );
}
