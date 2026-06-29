import { useQuery } from "@tanstack/react-query";

import {
  isNativeApp,
  readNativeStepCountRecords,
  requestNativeHealthPermissionStatus,
} from "@/shared/api/bridge/nativeBridge";
import type {
  HealthConnectionSource,
  HealthPermissionStatus,
} from "@/shared/api/bridge/nativeBridge.types";
import { isValidDateKey } from "@/shared/utils/dateFormat";

const MAX_STEPS = 999999;

type NativeStepCountResult = {
  permissionStatus: HealthPermissionStatus | null;
  readAt?: string;
  source: HealthConnectionSource;
  steps: number | null;
};

type NativeStepCountRecord = {
  date: string;
  source: Exclude<HealthConnectionSource, null>;
  steps: number;
};

type NativeStepCountRecordsResult = {
  permissionStatus: HealthPermissionStatus | null;
  readAt?: string;
  records: NativeStepCountRecord[];
  source: HealthConnectionSource;
};

function normalizeStepCount(steps: number) {
  return Math.min(MAX_STEPS, Math.max(0, Math.trunc(steps)));
}

function canAttemptNativeStepRead(
  permissionStatus: HealthPermissionStatus | null,
  source: HealthConnectionSource,
) {
  if (source === "health_connect") return permissionStatus === "granted";
  if (source === "apple_health") return true;

  return permissionStatus === "granted";
}

async function readNativeStepCountRecordsRange(
  startDate: string,
  endDate: string,
): Promise<NativeStepCountRecordsResult> {
  let permissionStatus: HealthPermissionStatus | null = null;
  let source: HealthConnectionSource = null;

  try {
    const permission = await requestNativeHealthPermissionStatus();
    permissionStatus = permission.permissionStatus;
    source = permission.source;
  } catch {
    return {
      permissionStatus,
      records: [],
      source,
    };
  }

  if (!canAttemptNativeStepRead(permissionStatus, source)) {
    return {
      permissionStatus,
      records: [],
      source,
    };
  }

  try {
    const result = await readNativeStepCountRecords({
      startDate,
      endDate,
    });
    const records = result.records.map((record) => ({
      ...record,
      steps: normalizeStepCount(record.steps),
    }));

    return {
      permissionStatus,
      readAt: result.readAt,
      records,
      source: records[0]?.source ?? source,
    };
  } catch {
    return {
      permissionStatus,
      records: [],
      source,
    };
  }
}

async function readNativeStepCount(date: string): Promise<NativeStepCountResult> {
  const result = await readNativeStepCountRecordsRange(date, date);
  const record = result.records.find((item) => item.date === date);

  return {
    permissionStatus: result.permissionStatus,
    readAt: result.readAt,
    source: record?.source ?? result.source,
    steps: record ? record.steps : null,
  };
}

function canUseNativeSteps(startDate: string, endDate: string, enabledOption?: boolean) {
  const canReadNativeSteps = isNativeApp();

  return (
    (enabledOption ?? true) &&
    canReadNativeSteps &&
    isValidDateKey(startDate) &&
    isValidDateKey(endDate)
  );
}

export function useNativeStepCountRecordsQuery(
  payload: { endDate: string; startDate: string },
  options?: { enabled?: boolean },
) {
  const enabled = canUseNativeSteps(payload.startDate, payload.endDate, options?.enabled);

  return useQuery({
    queryKey: ["native-step-count-records", payload.startDate, payload.endDate],
    queryFn: () => readNativeStepCountRecordsRange(payload.startDate, payload.endDate),
    enabled,
    retry: false,
    refetchOnMount: "always",
  });
}

export function useNativeStepCountQuery(date: string, options?: { enabled?: boolean }) {
  const enabled = canUseNativeSteps(date, date, options?.enabled);

  return useQuery({
    queryKey: ["native-step-count", date],
    queryFn: () => readNativeStepCount(date),
    enabled,
    retry: false,
    refetchOnMount: "always",
  });
}
