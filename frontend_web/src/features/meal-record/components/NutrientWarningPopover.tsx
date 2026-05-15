import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";

import styles from "../styles/NutrientWarningPopover.module.css";

export const DETAIL_WARNING_MESSAGE = [
  "실제로는 더 많이 들어있을 수 있어요.",
  "판매사에서 정확한 정보를 제공하고 있지 않아요.",
] as const;

type NutrientWarningPopoverProps = {
  className?: string;
};

export function NutrientWarningPopover({ className }: NutrientWarningPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className={`${styles.warningButton} ${className ?? ""}`}
        aria-label="영양성분 주의 안내"
      >
        <Info size={19} aria-hidden="true" />
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
            className={`${styles.warningTooltip} typo-label3`}
            initialFocus={false}
            finalFocus={false}
          >
            {DETAIL_WARNING_MESSAGE[0]}
            <br />
            {DETAIL_WARNING_MESSAGE[1]}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
