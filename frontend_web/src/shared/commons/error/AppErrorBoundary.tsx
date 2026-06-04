import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/shared/commons/button/Button";

import styles from "./AppErrorBoundary.module.css";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

function getErrorDetail(error: Error) {
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  const errorCode = (error as { error?: unknown }).error;

  return [
    error.name,
    typeof errorCode === "string" ? errorCode : null,
    typeof statusCode === "number" ? String(statusCode) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary] Unhandled render error", error, errorInfo);
  }

  private reloadPage = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    const detail = getErrorDetail(error);

    return (
      <main className={styles.screen}>
        <div className={styles.content}>
          <img
            src="/icons/system-icons/circle-info-color.svg"
            width={45}
            alt=""
            aria-hidden="true"
          />
          <h1 className={`${styles.title} typo-h2`}>화면을 불러오지 못했어요</h1>
          <p className={`${styles.description} typo-body2`}>
            문제가 발생했어요. 잠시 후 다시 시도해주세요.
          </p>
          {import.meta.env.DEV && detail ? <p className={styles.detail}>{detail}</p> : null}

          <Button onClick={this.reloadPage} fullWidth>
            다시 시도
          </Button>
        </div>
      </main>
    );
  }
}
