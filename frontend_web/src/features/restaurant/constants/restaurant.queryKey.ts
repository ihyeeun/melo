export const restaurantKeys = {
  all: ["restaurants"] as const,
  search: (keyword: string) => [...restaurantKeys.all, "search", keyword],
  detail: (filter?: string) => [...restaurantKeys.all, "detail", filter ?? "all"],
};
