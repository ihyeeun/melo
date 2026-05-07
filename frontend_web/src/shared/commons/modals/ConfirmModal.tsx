import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "@/shared/commons/button/Button";

import { BaseAlertModal } from "./BaseAlertModal";

type ConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: React.ReactNode;
  description?: React.ReactNode;

  cancelText?: string;
  confirmText?: string;

  confirmDisabled?: boolean;

  /**
   * confirm 누르면 즉시 닫을지 여부
   * - true: confirm 클릭 시 닫힘(간단한 동작)
   * - false: 서버 요청 성공 시점에 직접 onOpenChange(false) 해줘야 함
   */
  closeOnConfirm?: boolean;

  onCancel?: () => void | Promise<void>;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  cancelText = "취소",
  confirmText = "확인",
  confirmDisabled = false,
  closeOnConfirm = true,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <BaseAlertModal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {/* 취소는 무조건 닫기 */}
      <AlertDialog.Close
        render={(props) => (
          <Button
            {...props}
            onClick={(e) => {
              props.onClick?.(e); // 닫기 동작 유지
              if (!onCancel) {
                return;
              }

              void Promise.resolve(onCancel()).catch((error) => {
                console.error(error);
              });
            }}
            variant="outlined"
            interaction="normal"
            size="normal"
            color="primary"
          >
            {cancelText}
          </Button>
        )}
      />

      {/* 확인 */}
      {closeOnConfirm ? (
        <AlertDialog.Close
          render={(props) => (
            <Button
              {...props}
              disabled={confirmDisabled}
              onClick={(e) => {
                props.onClick?.(e); // 닫기 동작 유지
                void onConfirm(); // 로직 실행
              }}
              variant="filled"
              interaction="normal"
              size="normal"
              color="primary"
            >
              {confirmText}
            </Button>
          )}
        />
      ) : (
        // ✅ 서버 성공 후 닫기 패턴: 여기서는 닫지 않음
        <Button
          disabled={confirmDisabled}
          onClick={async () => {
            try {
              await onConfirm();
              onOpenChange(false);
            } catch (error) {
              // 에러는 onConfirm 내부에서 처리하거나 여기서 처리
              console.error(error);
            }
          }}
          variant="filled"
          interaction="normal"
          size="normal"
          color="primary"
        >
          {confirmText}
        </Button>
      )}
    </BaseAlertModal>
  );
}
