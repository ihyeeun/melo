export type MealRecordPeriod = "오전" | "오후";

export type MealRecordTimeValue = {
  period: MealRecordPeriod;
  hour: string;
  minute: string;
};

const MEAL_RECORD_TIME_REQUEST_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function formatTimeUnit(value: number) {
  return String(value).padStart(2, "0");
}

export function getCurrentMealRecordTime() {
  const now = new Date();
  return `${formatTimeUnit(now.getHours())}:${formatTimeUnit(now.getMinutes())}`;
}

export function normalizeMealRecordTime(value: string | null | undefined) {
  return typeof value === "string" && MEAL_RECORD_TIME_REQUEST_PATTERN.test(value) ? value : null;
}

export function toMealRecordTimeValue(mealTime: string): MealRecordTimeValue {
  const [hour = 0, minute = 0] = mealTime.split(":").map(Number);
  const hour24 = Number.isFinite(hour) ? hour : 0;
  const period: MealRecordPeriod = hour24 < 12 ? "오전" : "오후";
  const hour12 = hour24 % 12 || 12;

  return {
    period,
    hour: String(hour12),
    minute: formatTimeUnit(Number.isFinite(minute) ? minute : 0),
  };
}

export function formatMealRecordTime(mealTime: string) {
  const value = toMealRecordTimeValue(mealTime);
  return `${value.period} ${value.hour.padStart(2, "0")}:${value.minute}`;
}

export function toMealRecordTime(value: MealRecordTimeValue) {
  const displayHour = Number.parseInt(value.hour, 10);
  const hour12 = Number.isFinite(displayHour) ? displayHour % 12 : 0;
  const hour24 = value.period === "오후" ? hour12 + 12 : hour12;

  return `${formatTimeUnit(hour24)}:${value.minute.padStart(2, "0")}`;
}
