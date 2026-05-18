import {
  MEAL_TYPE_SET,
  type MealServingInputMode,
  type MealType,
} from "@/shared/api/types/api.dto";

export const CHAT_TO_MEAL_RECORD_SOURCE = "chat_bottom_sheet" as const;

export type MealRecordTransferMenu = {
  id: number;
  quantity: number;
  mode?: MealServingInputMode;
};

export type MealRecordTransferPreview = {
  id: number;
  name: string;
  brand?: string;
  unit_quantity: string;
  calories: number;
  weight?: number;
  unit?: number;
  data_source?: number;
};

export type MealRecordTransferState = {
  source: typeof CHAT_TO_MEAL_RECORD_SOURCE;
  dateKey: string;
  mealType: MealType;
  menus: MealRecordTransferMenu[];
  previews?: MealRecordTransferPreview[];
};

function toPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }

  return Math.round(quantity * 10000) / 10000;
}

function normalizeMode(mode: unknown): MealServingInputMode | undefined {
  if (mode === "unit" || mode === "weight") {
    return mode;
  }

  return undefined;
}

function normalizeMenus(value: unknown): MealRecordTransferMenu[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const menuById = new Map<number, MealRecordTransferMenu>();

  value.forEach((menu) => {
    if (!menu || typeof menu !== "object") {
      return;
    }

    const id = (menu as { id?: unknown }).id;
    const quantity = (menu as { quantity?: unknown }).quantity;
    const mode = (menu as { mode?: unknown }).mode;
    if (!toPositiveInt(id)) {
      return;
    }

    const normalizedQuantity =
      typeof quantity === "number" ? normalizeQuantity(quantity) : normalizeQuantity(1);

    menuById.set(id, {
      id,
      quantity: normalizedQuantity,
      mode: normalizeMode(mode),
    });
  });

  return [...menuById.values()];
}

function normalizePreviews(value: unknown): MealRecordTransferPreview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const previewById = new Map<number, MealRecordTransferPreview>();

  value.forEach((preview) => {
    if (!preview || typeof preview !== "object") {
      return;
    }

    const id = (preview as { id?: unknown }).id;
    const name = (preview as { name?: unknown }).name;
    const unitQuantity = (preview as { unit_quantity?: unknown }).unit_quantity;
    const calories = (preview as { calories?: unknown }).calories;

    if (!toPositiveInt(id)) {
      return;
    }

    if (typeof name !== "string" || name.trim().length === 0) {
      return;
    }

    if (typeof unitQuantity !== "string" || unitQuantity.trim().length === 0) {
      return;
    }

    if (typeof calories !== "number" || !Number.isFinite(calories) || calories <= 0) {
      return;
    }

    const brand = (preview as { brand?: unknown }).brand;
    const weight = (preview as { weight?: unknown }).weight;
    const unit = (preview as { unit?: unknown }).unit;
    const dataSource = (preview as { data_source?: unknown }).data_source;

    previewById.set(id, {
      id,
      name: name.trim(),
      brand: typeof brand === "string" && brand.trim().length > 0 ? brand.trim() : undefined,
      unit_quantity: unitQuantity.trim(),
      calories: Math.round(calories * 10000) / 10000,
      weight: typeof weight === "number" && Number.isFinite(weight) && weight > 0 ? weight : undefined,
      unit: unit === 0 || unit === 1 ? unit : undefined,
      data_source:
        typeof dataSource === "number" && Number.isInteger(dataSource) ? dataSource : undefined,
    });
  });

  return [...previewById.values()];
}

export function parseMealRecordTransferState(value: unknown): MealRecordTransferState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<MealRecordTransferState>;
  if (candidate.source !== CHAT_TO_MEAL_RECORD_SOURCE) {
    return null;
  }

  if (typeof candidate.dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.dateKey)) {
    return null;
  }

  if (typeof candidate.mealType !== "string" || !MEAL_TYPE_SET.has(candidate.mealType)) {
    return null;
  }

  return {
    source: CHAT_TO_MEAL_RECORD_SOURCE,
    dateKey: candidate.dateKey,
    mealType: candidate.mealType,
    menus: normalizeMenus(candidate.menus),
    previews: normalizePreviews(candidate.previews),
  };
}
