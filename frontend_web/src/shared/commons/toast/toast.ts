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

function show({
  title,
  description,
  timeout,
  type = "default",
  priority = "low",
}: ShowToastOptions) {
  return appToastManager.add({
    title,
    description,
    timeout,
    type,
    priority,
  });
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
