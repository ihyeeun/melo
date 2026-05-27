import { Popover } from "@base-ui/react/popover";
import { Fragment } from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "../styles/NutrientWarningPopover.module.css";

export const DETAIL_WARNING_MESSAGE = [
  "실제로는 더 많이 들어있을 수 있어요.",
  "판매사에서 정확한 정보를 제공하고 있지 않아요.",
] as const;

type NutrientWarningPopoverProps = {
  ariaLabel?: string;
  className?: string;
  messages?: readonly string[];
};

export function NutrientWarningPopover({
  ariaLabel = "영양성분 주의 안내",
  className,
  messages = DETAIL_WARNING_MESSAGE,
}: NutrientWarningPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className={`${styles.warningButton} ${className ?? ""}`}
        aria-label={ariaLabel}
      >
        <SystemIcon name="circle-info" size={19} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          className={styles.warningPositioner}
          side="left"
          align="center"
          sideOffset={12}
          collisionPadding={50}
        >
          <Popover.Popup
            className={`${styles.warningTooltip} typo-body3`}
            initialFocus={false}
            finalFocus={false}
          >
            {messages.map((message, index) => (
              <Fragment key={`${message}-${index}`}>
                {index > 0 && <br />}
                {message}
              </Fragment>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
