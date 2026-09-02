export const menstrualKeys = {
  all: ["menstrual"] as const,

  cycles: {
    all: () => [...menstrualKeys.all, "cycles"] as const,
    history: (headAnchor: string) =>
      [...menstrualKeys.cycles.all(), "history", { headAnchor }] as const,
  },

  detail: {
    all: () => [...menstrualKeys.all, "detail"] as const,
    day: (date: string) => [...menstrualKeys.detail.all(), date] as const,
  },
};
