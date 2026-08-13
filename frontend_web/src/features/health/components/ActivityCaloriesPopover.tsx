import { Popover } from "@base-ui/react/popover";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./ActivityCaloriesPopover.module.css";

type ActivityCaloriesBadgeVariant = "white" | "primary";

type ActivityCaloriesPopoverProps = {
  activityCalories: number | null | undefined;
  baseTargetCalories: number | null | undefined;
  className?: string;
  variant?: ActivityCaloriesBadgeVariant;
};

export default function ActivityCaloriesPopover({
  activityCalories,
  className = "",
  variant = "white",
}: ActivityCaloriesPopoverProps) {
  const calories =
    typeof activityCalories === "number" &&
    Number.isFinite(activityCalories) &&
    activityCalories > 0
      ? Math.round(activityCalories)
      : 0;

  if (calories === 0) {
    return null;
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className={`${styles.trigger} ${className ?? ""}`}
        aria-label="운동 칼로리 안내"
        onClick={(event) => event.stopPropagation()}
      >
        <SystemIcon name="info" size={18} className={styles.infoIcon} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          className={styles.positioner}
          side="bottom"
          align="center"
          sideOffset={8}
        >
          <Popover.Popup
            className={`${styles.popup} body-l-medium text-accent`}
            data-variant={variant}
            initialFocus={false}
            finalFocus={false}
          >
            <Popover.Arrow className={styles.arrow} data-variant={variant} />
            <p className="textCenter">운동으로 {calories.toLocaleString("ko-KR")}kcal 소모</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
