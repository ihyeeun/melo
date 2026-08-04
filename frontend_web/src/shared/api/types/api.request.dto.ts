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

/* ======
 * 운동
 * ====== */
export interface DeleteWorkoutRecordRequestDto {
  date: string;
  workout_id?: number; //null인 경우에 해당 날짜 전체 운동 기록 취소
}

export interface SearchWorkoutRequestDto {
  input: string;
  body_parts?: string;
  equipments?: string;
  limit: number;
  cursor?: number;
}

export interface UpsertWorkoutRecordRequestDto {
  date: string;
  workout_id: number;
  workout_duration: number;
  burned_calories: number;
  workout_type: "cardio" | "weight";
  intensity?: 0 | 1 | 2;
  set_list?: WorkoutSetRequestDto[];
}

export interface WorkoutSetRequestDto {
  set_order: number;
  weight: number;
  reps: number;
}
