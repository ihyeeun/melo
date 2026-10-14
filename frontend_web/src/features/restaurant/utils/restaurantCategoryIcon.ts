type RestaurantCategoryAppearance = Readonly<{
  emoji: string;
  backgroundColor: string;
}>;

const DEFAULT_RESTAURANT_APPEARANCE: RestaurantCategoryAppearance = {
  emoji: "🍲",
  backgroundColor: "var(--background-selected)",
};

const RESTAURANT_CATEGORY_APPEARANCES = new Map<string, RestaurantCategoryAppearance>([
  ["버거", { emoji: "🍔", backgroundColor: "#fff3e3" }],
  ["치킨", { emoji: "🍗", backgroundColor: "#FCF0DF" }],
  ["샌드위치/샐러드", { emoji: "🥪", backgroundColor: "#edf7ee" }],
  ["피자", { emoji: "🍕", backgroundColor: "var(--coral-100)" }],
  ["카페", { emoji: "☕", backgroundColor: "#efe5de" }],
  ["베이커리", { emoji: "🥐", backgroundColor: "#f3edfb" }],
]);

export function getRestaurantCategoryAppearance(
  category?: string | null,
): RestaurantCategoryAppearance {
  return (
    RESTAURANT_CATEGORY_APPEARANCES.get(category?.trim() ?? "") ?? DEFAULT_RESTAURANT_APPEARANCE
  );
}
