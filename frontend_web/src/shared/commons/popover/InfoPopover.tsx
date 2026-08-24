import { Popover } from "@base-ui/react/popover";
import { Fragment, type MouseEvent, type ReactNode } from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./InfoPopover.module.css";

type InfoPopoverSide = "top" | "right" | "bottom" | "left";
type InfoPopoverAlign = "start" | "center" | "end";

type InfoPopoverContentProps =
  | {
      children: ReactNode;
      messages?: never;
    }
  | {
      children?: never;
      messages: readonly string[];
    };

type InfoPopoverProps = InfoPopoverContentProps & {
  ariaLabel?: string;
  className?: string;
  iconSize?: number | string;
  side?: InfoPopoverSide;
  align?: InfoPopoverAlign;
};

export function InfoPopover({
  ariaLabel = "추가 안내",
  children,
  messages,
  className = "",
  iconSize = 19,
  side = "left",
  align = "center",
}: InfoPopoverProps) {
  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className={`${styles.trigger} ${className}`}
        aria-label={ariaLabel}
        onClick={handleTriggerClick}
      >
        <SystemIcon name="info" size={iconSize} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          className={styles.positioner}
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={50}
        >
          <Popover.Popup
            className={`${styles.popup} body-s-medium`}
            initialFocus={false}
            finalFocus={false}
          >
            <Popover.Arrow className={styles.arrow} />
            {messages
              ? messages.map((message, index) => (
                  <Fragment key={`${message}-${index}`}>
                    {index > 0 && <br />}
                    {message}
                  </Fragment>
                ))
              : children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
