import { useEffect } from "react";
import { Sheet } from "react-modal-sheet";

import { beginBottomSheetVisibilitySync } from "@/shared/api/bridge/nativeBridge";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  disableContentDrag?: boolean;
  children: React.ReactNode;
};

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  className,
  disableContentDrag = false,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    return beginBottomSheetVisibilitySync();
  }, [isOpen]);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} detent="content" className={className}>
      <Sheet.Container
        style={{
          paddingBottom: "var(--safe-area-bottom)",
          background: "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <Sheet.Header />
        <Sheet.Content disableDrag={disableContentDrag}>
          <div>
            {title ? <div>{title}</div> : null}

            {children}
          </div>
        </Sheet.Content>
      </Sheet.Container>

      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  );
}
