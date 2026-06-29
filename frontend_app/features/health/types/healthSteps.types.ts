export type HealthPermissionStatus =
  | "granted"
  | "denied"
  | "not_determined"
  | "restricted"
  | "unknown";

export type HealthConnectionSource = "apple_health" | "health_connect";

export type HealthStepCountRecord = {
  date: string;
  steps: number;
  source: HealthConnectionSource;
};

export type HealthStepsRequestPayload = {
  startDate: string;
  endDate: string;
};
