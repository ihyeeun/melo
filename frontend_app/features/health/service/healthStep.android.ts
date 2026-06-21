import {
  aggregateGroupByPeriod,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";

import type {
  HealthStepCountRecord,
  HealthStepsRequestPayload,
} from "@/features/health/types/healthSteps.types";

const HEALTH_CONNECT_SOURCE = "health_connect" as const;
const STEPS_READ_PERMISSION = {
  accessType: "read",
  recordType: "Steps",
} as const;

function hasStepsReadPermission(permissions: unknown[]) {
  return permissions.some((permission) => {
    const item = permission as {
      accessType?: string;
      recordType?: string;
    };

    return item.accessType === "read" && item.recordType === "Steps";
  });
}

async function initializeAndroidHealthConnect() {
  const sdkStatus = await getSdkStatus();

  if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    return false;
  }

  return initialize();
}

export async function getAndroidHealthPermissionStatus() {
  const isInitialized = await initializeAndroidHealthConnect();

  if (!isInitialized) {
    return {
      permissionStatus: "unknown" as const,
      source: HEALTH_CONNECT_SOURCE,
    };
  }

  const permissions = await getGrantedPermissions();

  return {
    permissionStatus: hasStepsReadPermission(permissions)
      ? ("granted" as const)
      : ("not_determined" as const),
    source: HEALTH_CONNECT_SOURCE,
  };
}

export async function requestAndroidHealthReadPermission() {
  const isInitialized = await initializeAndroidHealthConnect();

  if (!isInitialized) {
    return {
      permissionStatus: "unknown" as const,
      source: HEALTH_CONNECT_SOURCE,
    };
  }

  const grantedPermissions = await requestPermission([STEPS_READ_PERMISSION]);

  return {
    permissionStatus: hasStepsReadPermission(grantedPermissions)
      ? ("granted" as const)
      : ("denied" as const),
    source: HEALTH_CONNECT_SOURCE,
  };
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toLocalStartOfDayIsoString(dateKey: string) {
  return parseDateKey(dateKey).toISOString();
}

export async function readAndroidStepCountRecords(payload: HealthStepsRequestPayload) {
  const permission = await getAndroidHealthPermissionStatus();

  if (permission.permissionStatus !== "granted") {
    return {
      records: [] as HealthStepCountRecord[],
      readAt: new Date().toISOString(),
    };
  }

  const endDateExclusive = addDaysToDateKey(payload.endDate, 1);
  const startTime = toLocalStartOfDayIsoString(payload.startDate);
  const endTime = toLocalStartOfDayIsoString(endDateExclusive);

  const groups = await aggregateGroupByPeriod({
    recordType: "Steps",
    timeRangeFilter: {
      operator: "between",
      startTime,
      endTime,
    },
    timeRangeSlicer: {
      period: "DAYS",
      length: 1,
    },
  });

  const records: HealthStepCountRecord[] = groups.map((group) => ({
    date: group.startTime.slice(0, 10),
    steps: Math.trunc(group.result.COUNT_TOTAL ?? 0),
    source: HEALTH_CONNECT_SOURCE,
  }));

  return {
    records,
    readAt: new Date().toISOString(),
  };
}
