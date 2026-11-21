import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";

function toConsoleBreadcrumbMessage(args: unknown) {
  const [label] = Array.isArray(args) ? args : [];
  if (typeof label === "string") return label;
  if (label instanceof Error) return `${label.name}: ${label.message}`;

  return undefined;
}

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  Sentry.init({
    dsn,
    enabled: !__DEV__ && Boolean(dsn),
    environment: Updates.channel || "production",
    sendDefaultPii: false,
    beforeBreadcrumb(breadcrumb) {
      // 콘솔 인자에는 응답 데이터가 섞일 수 있어 첫 문구만 남긴다
      if (breadcrumb.category === "console") {
        return {
          ...breadcrumb,
          message: toConsoleBreadcrumbMessage(breadcrumb.data?.arguments),
          data: undefined,
        };
      }

      // API 주소의 쿼리에는 검색어 같은 입력값이 들어가므로 경로만 남긴다
      const url = breadcrumb.data?.url;
      if ((breadcrumb.category === "xhr" || breadcrumb.category === "fetch") && typeof url === "string") {
        return { ...breadcrumb, data: { ...breadcrumb.data, url: url.split("?")[0] } };
      }

      return breadcrumb;
    },
  });
}
