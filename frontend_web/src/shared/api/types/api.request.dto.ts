export interface NutritionLabelMenuRegisterRequestDto extends NutritionLabel {
  name: string;
  brand: string;
}

interface NutritionLabel {
  unit: number;
  weight: number;
  calories: number;
  carbs?: number;
  sugars?: number;
  sugar_alchol?: number;
  dietary_fiber?: number;
  protein?: number;
  fat?: number;
  sat_fat?: number;
  trans_fat?: number;
  un_sat_fat?: number;
  sodium?: number;
  caffeine?: number;
  potassium?: number;
  cholesterol?: number;
  alcohol?: number;
}
