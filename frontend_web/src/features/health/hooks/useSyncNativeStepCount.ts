import { useEffect, useState } from "react";

import {
  canUseNativeStepCount,
  type NativeStepConnectionStatus,
  readNativeStepCount,
} from "@/features/health/services/nativeStepCount.service";
import { useRegisterStepsMutation } from "@/features/home/hooks/mutations/useBodyLogMutation";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";

const nativeStepSyncCompletedDates = new Set<string>();
const nativeStepSyncingDates = new Set<string>();

type UseSyncNativeStepCountOptions = {
  enabled?: boolean;
  savedSteps?: number | null;
};

type NativeStepSyncState = {
  date: string;
  status: NativeStepConnectionStatus;
};

export function useSyncNativeStepCount(
  date: string,
  { enabled = true, savedSteps }: UseSyncNativeStepCountOptions = {},
) {
  const isNativeEnvironment = isNativeApp();
  const canSyncNativeSteps = canUseNativeStepCount(date, date, enabled);
  const [nativeStepSyncState, setNativeStepSyncState] = useState<NativeStepSyncState>({
    date,
    status: isNativeEnvironment ? "unknown" : "disconnected",
  });
  const { mutateAsync: registerNativeSteps } = useRegisterStepsMutation();
  const nativeStepConnectionStatus: NativeStepConnectionStatus = !isNativeEnvironment
    ? "disconnected"
    : !canSyncNativeSteps
      ? "unknown"
      : nativeStepSyncCompletedDates.has(date)
        ? "connected"
        : nativeStepSyncState.date === date
          ? nativeStepSyncState.status
          : "unknown";

  useEffect(() => {
    if (!isNativeEnvironment || !canSyncNativeSteps) return;
    if (nativeStepSyncCompletedDates.has(date) || nativeStepSyncingDates.has(date)) return;

    const syncNativeStepCount = async () => {
      nativeStepSyncingDates.add(date);
      setNativeStepSyncState({ date, status: "unknown" });

      try {
        const result = await readNativeStepCount(date, {
          shouldRequestPermission: true,
        });

        const nextConnectionStatus =
          result.connectionStatus === "connected" && result.steps === null
            ? "unknown"
            : result.connectionStatus;
        setNativeStepSyncState({ date, status: nextConnectionStatus });

        if (!result.readSucceeded || result.steps === null) {
          return;
        }

        if (savedSteps !== result.steps) {
          await registerNativeSteps({
            date,
            steps: result.steps,
          });
        }

        nativeStepSyncCompletedDates.add(date);
      } catch {
        // 자동 동기화 실패는 화면 진입을 막지 않고, 사용자는 직접 걸음 수를 입력할 수 있다.
        setNativeStepSyncState({ date, status: "unknown" });
      } finally {
        nativeStepSyncingDates.delete(date);
      }
    };

    void syncNativeStepCount();
  }, [canSyncNativeSteps, date, isNativeEnvironment, registerNativeSteps, savedSteps]);

  return {
    nativeStepConnectionStatus,
  };
}
