export const queryKeys = {
  dayMeals: {
    all: ["day-meals"] as const,
    byDate: (date: string) => ["day-meals", date] as const,
  },
  bodyStats: (date: string) => ["body-log", date] as const,
} as const;
