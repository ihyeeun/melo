import { Popover } from "@base-ui/react/popover";

import type { ActivityCaloriesSummary } from "@/features/health/hooks/useActivityCalories";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./ActivityCaloriesPopover.module.css";

type ActivityCaloriesBadgeVariant = "white" | "primary";

type ActivityCaloriesBadgeProps = ActivityCaloriesSummary & {
  className?: string;
  variant?: ActivityCaloriesBadgeVariant;
};

export default function ActivityCaloriesBadge({
  calories,
  className = "",
  steps,
  variant = "white",
}: ActivityCaloriesBadgeProps) {
  if (steps <= 0 || calories <= 0) {
    return null;
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className={`${styles.trigger} ${className ?? ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <SystemIcon name="circle-info" size={20} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          className={styles.positioner}
          side="bottom"
          align="center"
          sideOffset={8}
        >
          <Popover.Arrow className={styles.arrow} data-variant={variant} />
          <Popover.Popup
            className={`${styles.popup} typo-body3`}
            data-variant={variant}
            initialFocus={false}
            finalFocus={false}
          >
            <SystemIcon name="walking" mode="image" size={40} />
            <div>
              <p className={`${styles.step} typo-title3`}>+ {steps}걸음</p>
              <div className={styles.badge} data-variant={variant}>
                <SystemIcon name="fire" mode="image" size={20} />
                <p className="typo-label4 textAlternative">
                  {calories.toLocaleString("ko-KR")}kcal 소모
                </p>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
