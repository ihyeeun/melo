export const waterIntakeKeys = {
  all: ["water-intake"],

  record: {
    all: () => [...waterIntakeKeys.all, "record"] as const,
    date: (date: string) => [...waterIntakeKeys.record.all(), { date }] as const,
  },
};
