import { useCallback, useEffect, useState } from "react";

import {
  canUseNativeStepCount,
  type NativeStepConnectionStatus,
  readNativeStepCount,
} from "@/features/health/services/nativeStepCount.service";
import { useRegisterStepsMutation } from "@/features/home/hooks/mutations/useBodyLogMutation";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";

const nativeStepSyncCompletedDates = new Set<string>();
const nativeStepSyncingDates = new Set<string>();

// 걸음 수 권한은 처음 한 번만 자동으로 요청하고, 그 뒤에는 걸음 수 카드를 눌렀을 때만 요청한다
const STEP_PERMISSION_REQUESTED_STORAGE_KEY = "health-step-permission-requested";

function hasRequestedStepPermission() {
  try {
    return window.localStorage.getItem(STEP_PERMISSION_REQUESTED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markStepPermissionRequested() {
  try {
    window.localStorage.setItem(STEP_PERMISSION_REQUESTED_STORAGE_KEY, "1");
  } catch {
    // 저장하지 못하면 다음 진입 때 한 번 더 요청될 뿐이다
  }
}

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

  // 걸음 수를 읽어 저장하고, 화면에 보여 줄 연동 상태를 돌려준다
  const readAndSaveNativeSteps = useCallback(
    async (shouldRequestPermission: boolean): Promise<NativeStepConnectionStatus> => {
      nativeStepSyncingDates.add(date);

      try {
        const result = await readNativeStepCount(date, { shouldRequestPermission });
        if (shouldRequestPermission) markStepPermissionRequested();

        // 그날 데이터가 없으면(0보 포함) 직접 입력할 수 있게 하고, 0보는 저장하지 않아 직접 입력한 값을 덮어쓰지 않는다
        const hasStepData = result.steps !== null && result.steps > 0;
        const nextConnectionStatus =
          result.connectionStatus === "connected" && !hasStepData
            ? "no_data"
            : result.connectionStatus;

        if (!result.readSucceeded || !hasStepData || result.steps === null) {
          return nextConnectionStatus;
        }

        if (savedSteps !== result.steps) {
          await registerNativeSteps({
            date,
            steps: result.steps,
          });
        }

        nativeStepSyncCompletedDates.add(date);
        return nextConnectionStatus;
      } catch {
        // 자동 동기화 실패는 화면 진입을 막지 않고, 사용자는 직접 걸음 수를 입력할 수 있다.
        return "unknown";
      } finally {
        nativeStepSyncingDates.delete(date);
      }
    },
    [date, registerNativeSteps, savedSteps],
  );

  useEffect(() => {
    if (!isNativeEnvironment || !canSyncNativeSteps) return;
    if (nativeStepSyncCompletedDates.has(date) || nativeStepSyncingDates.has(date)) return;

    const syncNativeStepCount = async () => {
      const status = await readAndSaveNativeSteps(!hasRequestedStepPermission());
      setNativeStepSyncState({ date, status });
    };

    void syncNativeStepCount();
  }, [canSyncNativeSteps, date, isNativeEnvironment, readAndSaveNativeSteps]);

  // 걸음 수 카드를 눌렀을 때: 권한을 다시 요청하고 걸음 수를 읽어 본다
  const requestStepPermissionAndSync = useCallback(async () => {
    if (!isNativeEnvironment || !canSyncNativeSteps || nativeStepSyncingDates.has(date)) {
      return nativeStepConnectionStatus;
    }

    const status = await readAndSaveNativeSteps(true);
    setNativeStepSyncState({ date, status });
    return status;
  }, [
    canSyncNativeSteps,
    date,
    isNativeEnvironment,
    nativeStepConnectionStatus,
    readAndSaveNativeSteps,
  ]);

  return {
    nativeStepConnectionStatus,
    requestStepPermissionAndSync,
  };
}
