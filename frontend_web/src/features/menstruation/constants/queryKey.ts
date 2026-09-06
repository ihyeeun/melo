export const menstrualKeys = {
  all: ["menstrual"] as const,

  cycles: {
    all: () => [...menstrualKeys.all, "cycles"] as const,
    history: (headAnchor: string) =>
      [...menstrualKeys.cycles.all(), "history", { headAnchor }] as const,
  },
};
