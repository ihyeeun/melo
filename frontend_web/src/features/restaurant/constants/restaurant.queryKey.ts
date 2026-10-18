export const restaurantKeys = {
  all: ["restaurants"] as const,
  search: (keyword: string) => [...restaurantKeys.all, "search", keyword],
  detail: (restaurantId: number, filter?: string) => [
    ...restaurantKeys.all,
    restaurantId,
    filter ?? "all",
  ],
};
