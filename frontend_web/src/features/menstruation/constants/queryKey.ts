export const menstrualKeys = {
  all: ["menstrual"] as const,

  cycles: {
    all: () => [...menstrualKeys.all, "cycles"] as const,
    history: () => [...menstrualKeys.cycles.all(), "history"] as const,
  },

  detail: {
    all: () => [...menstrualKeys.all, "detail"] as const,
    day: (date: string) => [...menstrualKeys.detail.all(), date] as const,
  },
};
