import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";

import styles from "@/features/home/styles/HomeDashboardModeToggle.module.css";
import type { HomeDashboardMode } from "@/features/home/types/homeDashboard.types";

type Props = {
  value: HomeDashboardMode;
  onChange: (mode: HomeDashboardMode) => void;
  className?: string;
  onClick: () => void;
};

const MODE_OPTIONS: { label: string; value: HomeDashboardMode }[] = [
  { label: "기본", value: "daily" },
  { label: "생리", value: "menstruation" },
];

export default function HomeDashboardModeToggle({ value, onChange, className, onClick }: Props) {
  return (
    <ToggleGroup
      className={[styles.root, className].filter(Boolean).join(" ")}
      aria-label="홈 표시 모드"
      data-mode={value}
      value={[value]}
      onValueChange={(nextValues) => {
        const nextMode = nextValues[0];

        if (nextMode) {
          onChange(nextMode);
        }
      }}
      onClick={onClick}
    >
      <span className={styles.indicator} aria-hidden="true" />
      {MODE_OPTIONS.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className={`${styles.option} caption-m-medium`}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
