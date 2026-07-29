import { NUTRIENT_FORM_CONFIG } from "@/features/nutrient-entry/constants/nutrientDetailForm";
import type { MenuNutrientFieldKey } from "@/shared/api/types/api.dto";

export type NutrientGroup = (typeof NUTRIENT_FORM_CONFIG)[number]["group"] | "serving";
export type MainNutrientKey = "carbs" | "protein" | "fat";

export type DetailRow = {
  key: MenuNutrientFieldKey | "totalWeight";
  label: string;
  unit: "g" | "mg" | "ml";
  value: number | null;
  variant: "main" | "sub";
  group: NutrientGroup;
  showWarning: boolean;
};

export type DetailGroupSection = {
  group: NutrientGroup;
  rows: DetailRow[];
};

export type MainNutrientState = {
  value: number | null;
  isEstimated: boolean;
};

export type NutrientValues = Partial<Record<MenuNutrientFieldKey, number | null>>;

const DETAIL_GROUP_ORDER: ReadonlyArray<NutrientGroup> = [
  "serving",
  "carbs",
  "protein",
  "fat",
  "sodium",
  "caffeine",
  "potassium",
  "cholesterol",
  "alcohol",
];

const DETAIL_LABEL_OVERRIDES: Partial<Record<MenuNutrientFieldKey, string>> = {
  sugars: "당류",
  sugar_alchol: "당알코올(대체당)",
};

const MAIN_NUTRIENT_KEYS: ReadonlyArray<MainNutrientKey> = ["carbs", "protein", "fat"];
const MAIN_NUTRIENT_KEY_SET: ReadonlySet<MenuNutrientFieldKey> = new Set(MAIN_NUTRIENT_KEYS);
const CHILD_NUTRIENT_KEYS_BY_PARENT: Record<
  MainNutrientKey,
  ReadonlyArray<MenuNutrientFieldKey>
> = {
  carbs: ["sugars", "sugar_alchol", "dietary_fiber"],
  protein: [],
  fat: ["sat_fat", "trans_fat", "un_sat_fat"],
};

export function toNullableNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function roundDecimal(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function scaleNutrientValue(value: number | null | undefined, scaleFactor: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return roundDecimal(value * scaleFactor);
}

export function scaleRequiredValue(value: number, scaleFactor: number) {
  return roundDecimal(value * scaleFactor);
}

export function formatNutrientValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function isMainNutrientKey(key: MenuNutrientFieldKey): key is MainNutrientKey {
  return MAIN_NUTRIENT_KEY_SET.has(key);
}

export function resolveMainNutrientStates(
  nutrientValues: NutrientValues,
): Record<MainNutrientKey, MainNutrientState> {
  return MAIN_NUTRIENT_KEYS.reduce(
    (acc, key) => {
      const directValue = toNullableNumber(nutrientValues[key]);
      if (directValue !== null) {
        acc[key] = { value: directValue, isEstimated: false };
        return acc;
      }

      let childValueSum = 0;
      let hasChildValue = false;

      for (const childKey of CHILD_NUTRIENT_KEYS_BY_PARENT[key]) {
        const childValue = toNullableNumber(nutrientValues[childKey]);
        if (childValue !== null) {
          childValueSum += childValue;
          hasChildValue = true;
        }
      }

      if (!hasChildValue) {
        acc[key] = { value: null, isEstimated: false };
        return acc;
      }

      acc[key] = {
        value: roundDecimal(childValueSum),
        isEstimated: true,
      };
      return acc;
    },
    {} as Record<MainNutrientKey, MainNutrientState>,
  );
}

export function buildDetailRows({
  nutrientValues,
  mainNutrientStates,
}: {
  nutrientValues: NutrientValues;
  mainNutrientStates: Record<MainNutrientKey, MainNutrientState>;
}): DetailRow[] {
  return NUTRIENT_FORM_CONFIG.map((field) => {
    if (field.variant === "main" && isMainNutrientKey(field.key)) {
      const resolvedMainNutrient = mainNutrientStates[field.key];
      return {
        key: field.key,
        label: DETAIL_LABEL_OVERRIDES[field.key] ?? field.label,
        unit: field.unit,
        value: resolvedMainNutrient.value,
        variant: field.variant,
        group: field.group,
        showWarning: resolvedMainNutrient.isEstimated,
      };
    }

    return {
      key: field.key,
      label: DETAIL_LABEL_OVERRIDES[field.key] ?? field.label,
      unit: field.unit,
      value: toNullableNumber(nutrientValues[field.key]),
      variant: field.variant,
      group: field.group,
      showWarning: false,
    };
  });
}

export function buildDetailGroups(rows: DetailRow[]): DetailGroupSection[] {
  return DETAIL_GROUP_ORDER.reduce<DetailGroupSection[]>((sections, group) => {
    const groupRows = rows.filter((row) => row.group === group && row.value !== null);
    if (groupRows.length > 0) {
      sections.push({
        group,
        rows: groupRows,
      });
    }

    return sections;
  }, []);
}
