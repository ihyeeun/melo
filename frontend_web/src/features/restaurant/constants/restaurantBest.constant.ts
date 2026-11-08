import type { RestaurantDetailRequestDto } from "@/shared/api/types/api.request.dto";

export type BestFilter = NonNullable<RestaurantDetailRequestDto["filter"]>;

export const BEST_OPTIONS = [
  { filter: "균형", icon: "⚖️", tone: "balanced" },
  { filter: "저칼로리", icon: "🥬", tone: "light" },
  { filter: "단백질", icon: "💪", tone: "protein" },
] as const;
