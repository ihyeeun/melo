import "./BaseAlertModal.css";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import * as React from "react";

type BaseAlertModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  focusPopupOnOpen?: boolean;
};

export function BaseAlertModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  focusPopupOnOpen = false,
}: BaseAlertModalProps) {
  const popupRef = React.useRef<HTMLDivElement | null>(null);
  const actionCount = React.Children.toArray(children).filter(Boolean).length;

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="modal-backdrop" />

        <AlertDialog.Popup
          ref={popupRef}
          className="modal-popup"
          initialFocus={focusPopupOnOpen ? popupRef : undefined}
        >
          <div className="modal-surface">
            <AlertDialog.Title className="typo-title2">{title}</AlertDialog.Title>

            {description ? (
              <AlertDialog.Description className="typo-body2 modal-description">
                {description}
              </AlertDialog.Description>
            ) : null}
          </div>
          <div className="modal-actions" data-actions={actionCount}>
            {children}
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
