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

const emptyNativeStepCountRecordsResult: NativeStepCountRecordsResult = {
  permissionStatus: null,
  records: [],
  source: null,
};

function normalizeStepCount(steps: number) {
  return Math.min(MAX_STEPS, Math.max(0, Math.trunc(steps)));
}

async function readNativeStepCountRecordsRange(
  startDate: string,
  endDate: string,
): Promise<NativeStepCountRecordsResult> {
  try {
    const permission = await requestNativeHealthPermissionStatus();

    if (permission.permissionStatus !== "granted") {
      return {
        permissionStatus: permission.permissionStatus,
        records: [],
        source: permission.source,
      };
    }

    const result = await readNativeStepCountRecords({
      startDate,
      endDate,
    });

    return {
      permissionStatus: permission.permissionStatus,
      readAt: result.readAt,
      records: result.records.map((record) => ({
        ...record,
        steps: normalizeStepCount(record.steps),
      })),
      source: permission.source,
    };
  } catch (error) {
    console.warn("[HealthBridge] native steps display fallback", error);
    return emptyNativeStepCountRecordsResult;
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
