import type { MenuNutrientFieldKey } from "@/shared/api/types/api.dto";

export type NutrientFormKey = {
  key: MenuNutrientFieldKey;
  label: string;
  unit: "g" | "mg";
  variant: "main" | "sub";
  group:
    | "carbs"
    | "protein"
    | "fat"
    | "sodium"
    | "caffeine"
    | "potassium"
    | "cholesterol"
    | "alcohol";
};

export const NUTRIENT_FORM_CONFIG: NutrientFormKey[] = [
  { key: "carbs", label: "탄수화물", unit: "g", variant: "main", group: "carbs" },
  { key: "sugars", label: "당류", unit: "g", variant: "sub", group: "carbs" },
  { key: "sugar_alchol", label: "당알코올(대체당)", unit: "g", variant: "sub", group: "carbs" },
  { key: "dietary_fiber", label: "식이섬유", unit: "g", variant: "sub", group: "carbs" },

  { key: "protein", label: "단백질", unit: "g", variant: "main", group: "protein" },

  { key: "fat", label: "지방", unit: "g", variant: "main", group: "fat" },
  { key: "sat_fat", label: "포화지방", unit: "g", variant: "sub", group: "fat" },
  { key: "trans_fat", label: "트랜스지방", unit: "g", variant: "sub", group: "fat" },
  { key: "un_sat_fat", label: "불포화지방", unit: "g", variant: "sub", group: "fat" },

  { key: "sodium", label: "나트륨", unit: "mg", variant: "main", group: "sodium" },

  { key: "caffeine", label: "카페인", unit: "mg", variant: "main", group: "caffeine" },

  { key: "potassium", label: "칼륨", unit: "mg", variant: "main", group: "potassium" },

  { key: "cholesterol", label: "콜레스테롤", unit: "mg", variant: "main", group: "cholesterol" },

  { key: "alcohol", label: "알코올", unit: "g", variant: "main", group: "alcohol" },
];
