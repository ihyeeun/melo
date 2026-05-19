import "./AppToast.css";

import { Toast } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";

type AppToastType = "default" | "success" | "warning" | "error";

function ToastStatusIcon({ type }: { type?: string }) {
  switch (type as AppToastType) {
    case "success":
      return <CircleCheck size={24} />;
    case "warning":
      return <CircleAlert size={24} />;
    case "error":
      return <CircleX size={24} />;
    default:
      return <Info size={24} />;
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
            swipeDirection={["right", "down", "up", "left"]}
          >
            <span className="app-toast-icon" aria-hidden="true">
              <ToastStatusIcon type={item.type} />
            </span>
            <Toast.Content className="app-toast-content">
              {item.title ? <Toast.Title className="app-toast-title typo-title4" /> : null}
              {item.description ? (
                <Toast.Description className="app-toast-description typo-body4" />
              ) : null}
            </Toast.Content>
            {item.actionProps ? <Toast.Action className="app-toast-action" /> : null}
            <Toast.Close className="app-toast-close typo-body1" aria-label="알림 닫기">
              ×
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
