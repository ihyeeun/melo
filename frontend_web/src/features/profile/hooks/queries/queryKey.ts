export const queryKeys = {
  profile: ["profile"] as const,
  userGoalSnapshot: (date: string) => ["profile", "goal-snapshot", date] as const,

  snapshot: {
    all: () => [...queryKeys.profile, "snapshot"] as const,
    snapshot: (date: string) => [...queryKeys.snapshot.all(), date] as const,
  },
} as const;
