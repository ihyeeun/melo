import {
  MENU_NUTRIENT_FIELD_KEYS,
  type MenuNutrientFieldKey,
  type MenuNutrientFields,
} from "@/shared/api/types/api.dto";

export function toFiniteNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

export function toNullableFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function buildNutrientFormFields(
  source: Partial<Record<MenuNutrientFieldKey, unknown>>,
): Partial<MenuNutrientFields> {
  return Object.fromEntries(
    MENU_NUTRIENT_FIELD_KEYS.map((key) => [key, toFiniteNumberOrUndefined(source[key])]),
  ) as Partial<MenuNutrientFields>;
}

export function buildNullableNutrientFields(
  source: Partial<Record<MenuNutrientFieldKey, unknown>>,
): Record<MenuNutrientFieldKey, number | null> {
  return Object.fromEntries(
    MENU_NUTRIENT_FIELD_KEYS.map((key) => [key, toNullableFiniteNumber(source[key])]),
  ) as Record<MenuNutrientFieldKey, number | null>;
}

export function buildNutrientResetPatch() {
  return Object.fromEntries(
    MENU_NUTRIENT_FIELD_KEYS.map((key) => [key, undefined]),
  ) as Partial<Record<MenuNutrientFieldKey, undefined>>;
}
