import {
  HealthPermissionStatus,
  HealthStepCountRecord,
  HealthStepsRequestPayload,
} from "@/features/health/types/healthSteps.types";
import { BridgeHandledError } from "@/src/shared/api/bridge/bridgeError";
import {
  AuthorizationRequestStatus,
  getRequestStatusForAuthorization,
  isHealthDataAvailable,
  queryStatisticsForQuantity,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";

const STEP_COUNT_TYPE = "HKQuantityTypeIdentifierStepCount" as const;
const APPLE_HEALTH_SOURCE = "apple_health" as const;

function mapIosPermissionStatus(status: AuthorizationRequestStatus): HealthPermissionStatus {
  if (status === AuthorizationRequestStatus.unnecessary) return "unknown";
  if (status === AuthorizationRequestStatus.shouldRequest) return "not_determined";
  if (status === AuthorizationRequestStatus.unknown) return "unknown";
  return "unknown";
}

export async function getIosHealthPermissionStatus() {
  const isAvailable = isHealthDataAvailable();

  if (!isAvailable) {
    return {
      permissionStatus: "unknown",
      source: APPLE_HEALTH_SOURCE,
    };
  }

  const requestStatus = await getRequestStatusForAuthorization({
    toRead: [STEP_COUNT_TYPE],
  });
  const permissionStatus = mapIosPermissionStatus(requestStatus);

  return {
    permissionStatus,
    source: APPLE_HEALTH_SOURCE,
  };
}

export async function requestIosHealthReadPermission() {
  await requestAuthorization({
    toRead: [STEP_COUNT_TYPE],
  });

  return getIosHealthPermissionStatus();
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getDateKeysInRange(payload: HealthStepsRequestPayload) {
  const dateKeys: string[] = [];
  const endDate = parseDateKey(payload.endDate);

  for (let currentDate = parseDateKey(payload.startDate); currentDate <= endDate; ) {
    dateKeys.push(formatDateKey(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  return dateKeys;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function readIosStepCountRecords(payload: HealthStepsRequestPayload) {
  if (!isHealthDataAvailable()) {
    throw new BridgeHandledError(
      "이 기기에서는 건강 데이터를 사용할 수 없어요.",
      400,
      "HEALTH_DATA_UNAVAILABLE",
    );
  }

  const records = await Promise.all(
    getDateKeysInRange(payload).map(async (dateKey): Promise<HealthStepCountRecord | null> => {
      const startDate = parseDateKey(dateKey);
      const endDate = addDays(startDate, 1);
      const statistics = await queryStatisticsForQuantity(STEP_COUNT_TYPE, ["cumulativeSum"], {
        unit: "count",
        filter: {
          date: {
            startDate,
            endDate,
          },
        },
      });
      const quantity = statistics.sumQuantity?.quantity;

      if (typeof quantity !== "number" || !Number.isFinite(quantity)) return null;

      return {
        date: dateKey,
        steps: Math.trunc(quantity),
        source: APPLE_HEALTH_SOURCE,
      };
    }),
  );
  const filteredRecords = records.filter(
    (record): record is HealthStepCountRecord => record !== null,
  );

  return {
    records: filteredRecords,
    readAt: new Date().toISOString(),
  };
}
