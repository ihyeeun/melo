import { BottomSheet as SeedBottomSheet } from "@seed-design/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { useTabBarVisibilitySync } from "@/shared/api/bridge/useTabBarVisibilitySync";
import { useBottomSheetPositionerStyle } from "@/shared/commons/bottomSheet/useBottomSheetPositionerStyle";

import styles from "./BottomSheet.module.css";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  disableContentDrag?: boolean;
  children: ReactNode;
};

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
  className,
  disableContentDrag = false,
  children,
}: BottomSheetProps) {
  const positionerStyle = useBottomSheetPositionerStyle();
  const isOpenRef = useRef(isOpen);
  const [isTabBarHidden, setIsTabBarHidden] = useState(isOpen);

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
        style={positionerStyle}
      >
        <SeedBottomSheet.Backdrop />
        <SeedBottomSheet.Content className={styles.content} aria-describedby={undefined}>
          <SeedBottomSheet.Header
            className={styles.header}
            onPointerDownCapture={blurActiveElement}
          >
            <SeedBottomSheet.Handle className={styles.handle} />
          </SeedBottomSheet.Header>
          <SeedBottomSheet.Body className={styles.body}>
            {title && <SeedBottomSheet.Title>{title}</SeedBottomSheet.Title>}
            {children}
          </SeedBottomSheet.Body>
        </SeedBottomSheet.Content>
      </SeedBottomSheet.Positioner>
    </SeedBottomSheet.Root>
  );
}
