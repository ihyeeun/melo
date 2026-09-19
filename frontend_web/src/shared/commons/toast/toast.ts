import { appToastManager, type AppToastPosition, type AppToastType } from "./toastManager";

type ToastPriority = "low" | "high";

type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ShowToastOptions = {
  action?: ToastAction;
  dismissible?: boolean;
  title: string;
  description?: string;
  timeout?: number;
  type?: AppToastType;
  priority?: ToastPriority;
  position?: AppToastPosition;
};

const activeToastIdsBySignature = new Map<string, string>();

function getToastSignature(
  type: AppToastType | undefined,
  position: AppToastPosition,
  title: string,
  description?: string,
) {
  return JSON.stringify([type, position, title, description ?? ""]);
}

function show({
  action,
  dismissible = true,
  title,
  description,
  timeout,
  type,
  priority = "low",
  position = "center",
}: ShowToastOptions) {
  const signature = getToastSignature(type, position, title, description);
  const activeToastId = activeToastIdsBySignature.get(signature);
  if (activeToastId) {
    return activeToastId;
  }

  let toastId = "";
  toastId = appToastManager.add({
    title,
    description,
    timeout,
    type,
    priority,
    actionProps: action
      ? {
          children: action.label,
          onClick: action.onClick,
        }
      : undefined,
    data: {
      dismissible,
      position,
    },
    onRemove: () => {
      if (activeToastIdsBySignature.get(signature) === toastId) {
        activeToastIdsBySignature.delete(signature);
      }
    },
  });
  activeToastIdsBySignature.set(signature, toastId);

  return toastId;
}

export const toast = {
  show,
  info: (title: string, description?: string) =>
    show({ title, description, type: "info", timeout: 4000 }),
  success: (title: string, description?: string) =>
    show({ title, description, type: "success", timeout: 2000 }),
  warning: (title: string, description?: string) =>
    show({ title, description, type: "warning", timeout: 2600, priority: "high" }),
  error: (title: string, description?: string) =>
    show({ title, description, type: "error", timeout: 3000, priority: "high" }),
  close: (id: string) => appToastManager.close(id),
};
