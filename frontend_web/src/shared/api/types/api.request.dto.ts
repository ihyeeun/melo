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

export interface RegisterMealRequestDto {
  date: string; //날짜 YYYY-MM-DD
  time: 0 | 1 | 2 | 3 | 4; //기록 시간대 0~4
  meal_time?: string; //실제 식사 시간 HH:MM
  image?: string;
  menu_ids?: number[];
  menu_quantities?: number[];
  menu_input_modes?: Array<0 | 1>; //0: 단위, 1: 중량
  menu_set_ids?: number[] | null;
}

export interface DeleteMealRequestDto {
  date: string; //날짜 YYYY-MM-DD
  time: 0 | 1 | 2 | 3 | 4; //기록 시간대 0~4
  menu_id?: number;
}

export interface UpsertFolderRequestDto {
  folder_id?: number; // 미입력 시 새 폴더 생성, 수정할 폴더 Id
  folder_name: string;
  menu_ids: number[];
  menu_quantities: number[];
  menu_input_modes: Array<0 | 1>; //0: 단위, 1: 중량
}

export interface UpsertMenuSetRequestDto {
  set_id?: number; // 미입력 시 새 세트 생성, 수정할 세트 Id
  set_name: string;
  menu_ids: number[];
  menu_quantities: number[];
  menu_input_modes: Array<0 | 1>; //0: 단위, 1: 중량
}
