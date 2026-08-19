export type ViewMode = "week" | "month";

export type CalendarDay = {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  hasRecord: boolean;
};

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
