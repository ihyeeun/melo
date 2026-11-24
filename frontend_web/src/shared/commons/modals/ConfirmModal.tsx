import { AlertDialog } from "@base-ui/react/alert-dialog";

import { useTabBarVisibilitySync } from "@/shared/api/bridge/useTabBarVisibilitySync";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import { Button } from "@/shared/commons/button/Button";

import { BaseAlertModal } from "./BaseAlertModal";

type ConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: React.ReactNode;
  description?: React.ReactNode;

  cancelText?: string;
  confirmText?: string;
  actionOrder?: "cancel-confirm" | "confirm-cancel";
  /**
   * 주황으로 강조할 버튼
   * - confirm: 실행이 주황, [취소]는 테두리 (기본)
   * - cancel: 실수로 누르면 곤란한 실행(삭제 · 로그아웃 · 탈퇴 · 나가기)은 [취소]를 주황으로, 실행은 회색 글자로
   */
  emphasis?: "confirm" | "cancel";

  /** 모달이 열려 있는 동안 네이티브 앱의 하단 탭바를 숨김 */
  hideTabBar?: boolean;
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
  actionOrder = "cancel-confirm",
  emphasis = "confirm",
  hideTabBar = false,
  confirmDisabled = false,
  closeOnConfirm = true,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  useTabBarVisibilitySync(open && hideTabBar);

  const isCancelEmphasized = emphasis === "cancel";

  const cancelAction = (
    <AlertDialog.Close
      key="cancel"
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
          {...(isCancelEmphasized
            ? { variant: "default" as const }
            : { variant: "outlined" as const, border: "primary" as const })}
          size="s"
        >
          {cancelText}
        </Button>
      )}
    />
  );

  const confirmAction = closeOnConfirm ? (
    <AlertDialog.Close
      key="confirm"
      render={(props) => (
        <Button
          {...props}
          disabled={confirmDisabled}
          onClick={(e) => {
            props.onClick?.(e); // 닫기 동작 유지
            void onConfirm(); // 로직 실행
          }}
          variant={isCancelEmphasized ? "dismiss" : "default"}
          size="s"
        >
          {confirmText}
        </Button>
      )}
    />
  ) : (
    // 서버 성공 후 닫기 패턴: 여기서는 닫지 않음
    <Button
      key="confirm"
      disabled={confirmDisabled}
      onClick={async () => {
        try {
          await onConfirm();
          onOpenChange(false);
        } catch (error) {
          // 에러는 onConfirm 내부에서 처리하거나 여기서 처리
          if (!isRequestAbortError(error)) console.error(error);
        }
      }}
      variant={isCancelEmphasized ? "dismiss" : "default"}
      size="s"
    >
      {confirmText}
    </Button>
  );

  const actions =
    actionOrder === "confirm-cancel"
      ? [confirmAction, cancelAction]
      : [cancelAction, confirmAction];

  return (
    <BaseAlertModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      focusPopupOnOpen
    >
      {actions}
    </BaseAlertModal>
  );
}
