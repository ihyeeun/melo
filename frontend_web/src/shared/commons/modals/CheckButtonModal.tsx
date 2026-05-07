import { AlertDialog } from "@base-ui/react/alert-dialog";
import * as React from "react";

import { Button } from "@/shared/commons/button/Button";

import { BaseAlertModal } from "./BaseAlertModal";

type CheckButtonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: React.ReactNode;
  description?: React.ReactNode;

  confirmText?: string;
  onConfirm?: () => void; // 선택 (그냥 닫기만 해도 됨)
  confirmDisabled?: boolean;
};

export function CheckButtonModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "확인",
  onConfirm,
  confirmDisabled,
}: CheckButtonModalProps) {
  return (
    <BaseAlertModal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <AlertDialog.Close
        render={(props) => (
          <Button
            {...props}
            variant="filled"
            color="primary"
            size="normal"
            interaction="normal"
            disabled={confirmDisabled}
            onClick={(e) => {
              onConfirm?.();
              props.onClick?.(e);
            }}
          >
            {confirmText}
          </Button>
        )}
      />
    </BaseAlertModal>
  );
}
