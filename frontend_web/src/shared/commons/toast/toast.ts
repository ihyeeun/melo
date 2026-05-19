import { appToastManager } from "./toastManager";

type ToastPriority = "low" | "high";
type ToastType = "default" | "success" | "warning" | "error";

type ShowToastOptions = {
  title: string;
  description?: string;
  timeout?: number;
  type?: ToastType;
  priority?: ToastPriority;
};

const activeToastIdsBySignature = new Map<string, string>();

function getToastSignature(type: ToastType, title: string, description?: string) {
  return `${type}:${title}:${description ?? ""}`;
}

function show({
  title,
  description,
  timeout,
  type = "default",
  priority = "low",
}: ShowToastOptions) {
  const signature = getToastSignature(type, title, description);
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
  success: (title: string, description?: string) =>
    show({ title, description, type: "success", timeout: 1200 }),
  warning: (title: string, description?: string) =>
    show({ title, description, type: "warning", timeout: 2600, priority: "high" }),
  error: (title: string, description?: string) =>
    show({ title, description, type: "error", timeout: 3000, priority: "high" }),
  close: (id: string) => appToastManager.close(id),
};
