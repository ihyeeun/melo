export type ViewMode = "week" | "month";

export type CalendarDay = {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  hasRecord: boolean;
};

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export const CALENDAR_VIEW_MODE = {
  MEAL_INTAKE: "intake",
  WORKOUT_RECORD: "workout",
  BODY_WEIGHT: "weight",
  WATER_RECORD: "water",
} as const;

export type CalendarViewMode = (typeof CALENDAR_VIEW_MODE)[keyof typeof CALENDAR_VIEW_MODE];
