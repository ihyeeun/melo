import type {
  MenstruationFlow,
  MenstruationStatus,
  MenstruationSymptom,
} from "@/features/menstruation/types/menstruation.type";

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
  body_part_major?: string; //운동 부위 대분류 필터. [유산소, 가슴, 등, 하체, 어깨, 팔, 코어] 중 하나
  body_part_minor?: string; //운동 부위 소분류 필터. [허벅지, 종아리, 상완, 전완, 복부, 허리, 목] 등
  equipment_category?: string; //운동 기구 대분류. [바벨, 덤벨, 케틀벨, 밴드, 머신, 스미스 머신, 맨몸, 폼롤러, 케이블 머신, 기타]
  equipment_detail?: string; //기구 상세 분류. 머신 또는 기타 기구의 세부 이름
  equipment_original_detail?: string; //원본 운동 데이터의 기구명
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

/* ======
 * 월경 기록
 * ====== */
export interface CreateMenstrualCycleRequestDto {
  date: string;
  flow?: MenstruationFlow;
  symptoms?: MenstruationSymptom[];
}

export interface CreateMenstrualRecordRequestDto extends CreateMenstrualCycleRequestDto {
  menstruation_status: MenstruationStatus;
  cycle_id: number;
}

export interface MenstrualRecordFieldsDto extends CreateMenstrualCycleRequestDto {
  menstruation_status: MenstruationStatus;
}
