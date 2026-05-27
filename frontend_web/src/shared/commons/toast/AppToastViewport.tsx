import "./AppToast.css";

import { Toast } from "@base-ui/react/toast";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

type AppToastType = "default" | "success" | "warning" | "error";

function ToastStatusIcon({ type }: { type?: string }) {
  switch (type as AppToastType) {
    case "success":
      return <SystemIcon name="check" size={14} />;
    case "warning":
      return <span className="app-toast-status-mark">!</span>;
    case "error":
      return <SystemIcon name="close" size={14} />;
    default:
      return <span className="app-toast-status-mark">i</span>;
  }
}

export function AppToastViewport() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className="app-toast-viewport">
        {toasts.map((item) => (
          <Toast.Root
            key={item.id}
            toast={item}
            className="app-toast"
            data-has-description={item.description ? "true" : undefined}
            swipeDirection={["right", "down", "up", "left"]}
          >
            <span className="app-toast-icon" aria-hidden="true">
              <ToastStatusIcon type={item.type} />
            </span>
            <Toast.Content className="app-toast-content">
              {item.title ? <Toast.Title className="app-toast-title typo-body2" /> : null}
              {item.description ? (
                <Toast.Description className="app-toast-description typo-body3" />
              ) : null}
            </Toast.Content>
            {item.actionProps ? <Toast.Action className="app-toast-action" /> : null}
            <Toast.Close className="app-toast-close" aria-label="알림 닫기">
              <SystemIcon name="close" size={20} />
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
