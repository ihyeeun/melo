import { Popover } from "@base-ui/react/popover";
import { Fragment } from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "../styles/NutrientWarningPopover.module.css";

export const DETAIL_WARNING_MESSAGE = [
  "실제로는 더 많이 들어있을 수 있어요.",
  "판매사에서 정확한 정보를 제공하고 있지 않아요.",
] as const;

export const NET_CARBS_NOTICE_MESSAGE = [
  "탄수화물에서 대체당과 식이섬유를 뺀 순탄수를 기준으로 탄수화물 정보를 제공하고 있어요.",
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
        <SystemIcon name="info" size={19} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          className={styles.warningPositioner}
          side="left"
          align="center"
          sideOffset={4}
          collisionPadding={50}
        >
          <Popover.Popup
            className={`${styles.warningTooltip} body-l-medium text-accent`}
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
