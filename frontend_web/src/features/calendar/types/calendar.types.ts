export type ViewMode = "week" | "month";

export type CalendarDay = {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  hasRecord: boolean;
};
