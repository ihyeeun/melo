import "@seed-design/css/base.css";
import "./shared/styles/tokens.css";
import "./index.css";

import { Toast } from "@base-ui/react/toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRoot } from "react-dom/client";

import { queryClient } from "@/shared/api/queryClient";
import { AppErrorBoundary } from "@/shared/commons/error/AppErrorBoundary";
import { AppToastViewport } from "@/shared/commons/toast/AppToastViewport";
import { appToastManager } from "@/shared/commons/toast/toastManager";

import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <Toast.Provider toastManager={appToastManager} timeout={2600} limit={2}>
      <AppErrorBoundary>
        <App />
        <AppToastViewport />
      </AppErrorBoundary>
    </Toast.Provider>
    <ReactQueryDevtools />
  </QueryClientProvider>,
);
