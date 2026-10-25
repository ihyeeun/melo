export type ViewMode = "week" | "month";

export type CalendarDay = {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
};

export type DayCellRenderProps = {
  day: CalendarDay;
  weekdayLabel?: string;
  onSelect: (date: Date) => void;
  variant?: ViewMode;
};

export const CALENDAR_VIEW_MODE = {
  MEAL_INTAKE: "intake",
  WORKOUT_RECORD: "workout",
  BODY_WEIGHT: "weight",
  WATER_RECORD: "water",
} as const;

export type CalendarViewMode = (typeof CALENDAR_VIEW_MODE)[keyof typeof CALENDAR_VIEW_MODE];
