export const queryKeys = {
  recordedDates: {
    all: ["calendar", "recorded-dates"] as const,
    range: (startDate: string, endDate: string) =>
      ["calendar", "recorded-dates", startDate, endDate] as const,
  },
} as const;
