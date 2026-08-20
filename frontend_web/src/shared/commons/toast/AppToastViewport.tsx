import "./AppToast.css";

import { Toast, type ToastObject } from "@base-ui/react/toast";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import type { AppToastData, AppToastPosition, AppToastType } from "./toastManager";

function getToastStatusIcon(type?: string) {
  switch (type as AppToastType) {
    case "success":
      return <SystemIcon name="check" size={14} />;
    case "warning":
      return <span className="app-toast-status-mark">!</span>;
    case "error":
      return <SystemIcon name="exit" size={14} />;
    case "info":
      return <span className="app-toast-status-mark">i</span>;
    default:
      return;
  }
}

function AppToastItem({ item }: { item: ToastObject<AppToastData> }) {
  const statusIcon = getToastStatusIcon(item.type);

  return (
    <Toast.Root
      toast={item}
      className="app-toast"
      data-has-description={item.description ? "true" : undefined}
      swipeDirection={["right", "down", "up", "left"]}
    >
      {statusIcon ? (
        <span className="app-toast-icon" aria-hidden="true">
          {statusIcon}
        </span>
      ) : null}
      <Toast.Content className="app-toast-content">
        {item.title ? <Toast.Title className="app-toast-title body-l-medium" /> : null}
        {item.description ? (
          <Toast.Description className="app-toast-description body-s-medium" />
        ) : null}
      </Toast.Content>
      {item.actionProps ? <Toast.Action className="app-toast-action body-l-semi" /> : null}
      {item.data?.dismissible !== false ? (
        <Toast.Close className="app-toast-close" aria-label="알림 닫기">
          <SystemIcon name="exit" size={20} />
        </Toast.Close>
      ) : null}
    </Toast.Root>
  );
}

export function AppToastViewport() {
  const { toasts } = Toast.useToastManager();
  const positions: AppToastPosition[] = ["center", "bottom"];

  return (
    <Toast.Portal>
      <Toast.Viewport className="app-toast-viewport">
        {positions.map((position) => (
          <div key={position} className="app-toast-region" data-position={position}>
            {toasts
              .filter((item) => (item.data?.position ?? "center") === position)
              .map((item) => (
                <AppToastItem key={item.id} item={item} />
              ))}
          </div>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
