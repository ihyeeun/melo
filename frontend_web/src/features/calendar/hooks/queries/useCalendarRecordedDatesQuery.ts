type UseCalendarRecordedDatesQueryParams = {
  enabled: boolean;
  startDate: string;
  endDate: string;
};

const EMPTY_RECORDED_DATES: string[] = ["2026-05-16"];

export function useCalendarRecordedDatesQuery({
  enabled,
  startDate,
  endDate,
}: UseCalendarRecordedDatesQueryParams) {
  void enabled;
  void startDate;
  void endDate;

  return {
    recordedDates: EMPTY_RECORDED_DATES,
  };
}
