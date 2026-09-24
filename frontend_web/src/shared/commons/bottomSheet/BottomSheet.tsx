import { BottomSheet as SeedBottomSheet } from "@seed-design/react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { useTabBarVisibilitySync } from "@/shared/api/bridge/useTabBarVisibilitySync";
import { useBottomSheetPositionerStyle } from "@/shared/commons/bottomSheet/useBottomSheetPositionerStyle";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./BottomSheet.module.css";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  titleRightSlot?: ReactNode;
  className?: string;
  bodyClassName?: string;
  positionerStyle?: CSSProperties;
  bottomPadding?: number | string;
  modal?: boolean;
  disableContentDrag?: boolean;
  children: ReactNode;
};

type BottomSheetContentStyle = CSSProperties & {
  "--bottom-sheet-extra-bottom-padding"?: string;
};

function cx(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function blurActiveElement() {
  if (typeof document === "undefined") {
    return;
  }

  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  titleRightSlot,
  className,
  bodyClassName,
  positionerStyle,
  bottomPadding,
  modal = true,
  disableContentDrag = false,
  children,
}: BottomSheetProps) {
  const basePositionerStyle = useBottomSheetPositionerStyle();
  const isOpenRef = useRef(isOpen);
  const [isTabBarHidden, setIsTabBarHidden] = useState(isOpen);
  const bottomPaddingValue =
    typeof bottomPadding === "number" ? `${bottomPadding}px` : bottomPadding;
  const contentStyle: BottomSheetContentStyle | undefined = bottomPadding
    ? { "--bottom-sheet-extra-bottom-padding": bottomPaddingValue }
    : undefined;

  useEffect(() => {
    isOpenRef.current = isOpen;

    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep the tab bar hidden until the bottom sheet close animation finishes.
      setIsTabBarHidden(true);
    }
  }, [isOpen]);

  useTabBarVisibilitySync(isTabBarHidden);

  return (
    <SeedBottomSheet.Root
      open={isOpen}
      autoFocus={false}
      handleOnly={disableContentDrag}
      modal={modal}
      repositionInputs={false}
      onAnimationEnd={(open) => {
        if (!open && !isOpenRef.current) {
          setIsTabBarHidden(false);
        }
      }}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SeedBottomSheet.Positioner
        className={className}
        style={{ ...basePositionerStyle, ...positionerStyle }}
      >
        {modal ? (
          <SeedBottomSheet.Backdrop />
        ) : (
          <button
            type="button"
            className={styles.backdrop}
            aria-label="바텀시트 닫기"
            onClick={onClose}
            tabIndex={-1}
          />
        )}
        <SeedBottomSheet.Content
          className={styles.sheetContent}
          style={contentStyle}
          aria-describedby={undefined}
        >
          <SeedBottomSheet.Header
            className={styles.header}
            onPointerDownCapture={blurActiveElement}
          >
            {title && <h2 className="title-s-semi text-primary">{title}</h2>}
            {titleRightSlot ? (
              titleRightSlot
            ) : (
              <button type="button" onClick={onClose} className="marginLeft">
                <SystemIcon name="exit" size={24} className="text-primary" />
              </button>
            )}
          </SeedBottomSheet.Header>
          <SeedBottomSheet.Body className={cx(styles.body, bodyClassName)}>
            {children}
          </SeedBottomSheet.Body>
        </SeedBottomSheet.Content>
      </SeedBottomSheet.Positioner>
    </SeedBottomSheet.Root>
  );
}
