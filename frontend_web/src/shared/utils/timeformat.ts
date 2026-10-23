export const MEAL_TYPE_OPTIONS = [
  { key: "0", label: "아침" },
  { key: "1", label: "점심" },
  { key: "2", label: "저녁" },
  { key: "3", label: "간식" },
  { key: "4", label: "야식" },
] as const;

export function mealTimeNumberToLabel(time: number): string {
  return MEAL_TYPE_OPTIONS.find((option) => option.key === String(time))?.label ?? "식사";
}
