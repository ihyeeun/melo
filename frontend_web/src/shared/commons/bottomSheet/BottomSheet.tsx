import "./BottomSheet.css";

import { Sheet } from "react-modal-sheet";

import { useTabBarVisibilitySync } from "@/shared/api/bridge/useTabBarVisibilitySync";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  disableContentDrag?: boolean;
  children: React.ReactNode;
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
  useTabBarVisibilitySync(isOpen);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} detent="content" className={className}>
      <Sheet.Container
        style={{
          paddingBottom:
            "max(0px, calc(var(--safe-area-bottom) - var(--keyboard-inset-height, 0px)))",
          background: "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: "none",
        }}
      >
        <Sheet.Header
          className="melo-bottom-sheet-header"
          onPointerDownCapture={blurActiveElement}
        >
          <div className="melo-bottom-sheet-handle" aria-hidden="true" />
        </Sheet.Header>
        <Sheet.Content disableDrag={disableContentDrag}>
          <div>
            {title ? <div>{title}</div> : null}

            {children}
          </div>
        </Sheet.Content>
      </Sheet.Container>

      <Sheet.Backdrop
        onTap={onClose}
        transition={{ duration: 0.25 }}
        style={{
          backgroundColor: "var(--dimmer-dimmer)",
          transform: "none",
        }}
      />
    </Sheet>
  );
}
