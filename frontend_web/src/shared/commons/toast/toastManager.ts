import { Toast } from "@base-ui/react/toast";

export type AppToastPosition = "center" | "bottom";
export type AppToastType = "success" | "warning" | "error" | "info";

export type AppToastData = {
  dismissible?: boolean;
  position?: AppToastPosition;
};

export const appToastManager = Toast.createToastManager<AppToastData>();
