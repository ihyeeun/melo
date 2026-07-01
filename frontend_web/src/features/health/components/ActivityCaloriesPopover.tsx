import { Popover } from "@base-ui/react/popover";

import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./ActivityCaloriesPopover.module.css";

type ActivityCaloriesBadgeVariant = "white" | "primary";

type ActivityCaloriesBadgeProps = {
  className?: string;
  variant?: ActivityCaloriesBadgeVariant;
  date?: string;
};

export default function ActivityCaloriesPopover({
  className = "",
  variant = "white",
  date,
}: ActivityCaloriesBadgeProps) {
  const { summary } = useActivityCalories(date);

  if (!summary) {
    return null;
  }

  const { calories, stepCount } = summary;
  if (stepCount <= 0 || calories <= 0) {
    return null;
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className={`${styles.trigger} ${className ?? ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <SystemIcon name="circle-info" size={20} className={styles.infoIcon} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          className={styles.positioner}
          side="bottom"
          align="center"
          sideOffset={8}
        >
          <Popover.Popup
            className={`${styles.popup} typo-body3`}
            data-variant={variant}
            initialFocus={false}
            finalFocus={false}
          >
            <Popover.Arrow className={styles.arrow} data-variant={variant} />
            <SystemIcon name="walking" mode="image" size={40} />
            <div>
              <p className={`${styles.step} typo-title3`}>+ {stepCount}걸음</p>
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
