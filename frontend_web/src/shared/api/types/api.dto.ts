import type { MenuSimpleResponseDto as ApiMenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";

export const MENU_DATA_SOURCE = {
  PUBLIC: 0,
  PERSONAL: 1,
} as const;

export const MENU_UNIT = {
  GRAM: 0,
  MILLILITER: 1,
} as const;

export const MENU_INPUT_MODE = {
  UNIT: 0,
  WEIGHT: 1,
} as const;

export const MEAL_TIME = {
  BREAKFAST: 0,
  LUNCH: 1,
  DINNER: 2,
  SNACK: 3,
  LATE_NIGHT_SNACK: 4,
} as const;

export type MenuId = number;
export type MenuDataSource = (typeof MENU_DATA_SOURCE)[keyof typeof MENU_DATA_SOURCE];
export type MenuUnit = (typeof MENU_UNIT)[keyof typeof MENU_UNIT];
export type MealMenuInputMode = (typeof MENU_INPUT_MODE)[keyof typeof MENU_INPUT_MODE];
export type MealTime = (typeof MEAL_TIME)[keyof typeof MEAL_TIME];
export type ApiDate = string;

export interface MenuIdField {
  id: MenuId;
}

export interface SearchInputField {
  input: string;
}

export interface DateField {
  date: ApiDate;
}

export interface MealTimeField {
  time: MealTime;
}

export interface MenuBaseFields extends MenuIdField {
  data_source: MenuDataSource;
  is_deleted: number;
  name: string;
  brand: string;
  category: string;
  unit: MenuUnit;
  weight: number;
  unit_quantity: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface MenuNutrientFields {
  carbs: number;
  sugars: number;
  sugar_alchol: number;
  dietary_fiber: number;
  protein: number;
  fat: number;
  sat_fat: number;
  trans_fat: number;
  un_sat_fat: number;
  sodium: number;
  caffeine: number;
  potassium: number;
  cholesterol: number;
  alcohol: number;
}

export const MENU_NUTRIENT_FIELD_KEYS = [
  "carbs",
  "sugars",
  "sugar_alchol",
  "dietary_fiber",
  "protein",
  "fat",
  "sat_fat",
  "trans_fat",
  "un_sat_fat",
  "sodium",
  "caffeine",
  "potassium",
  "cholesterol",
  "alcohol",
] as const satisfies ReadonlyArray<keyof MenuNutrientFields>;

export type MenuNutrientFieldKey = (typeof MENU_NUTRIENT_FIELD_KEYS)[number];

type MenuSimpleSubNutrientFields = Partial<
  Pick<MenuNutrientFields, "sugars" | "sat_fat" | "trans_fat" | "un_sat_fat">
>;

export type MenuSimpleResponseDto = MenuBaseFields & MenuSimpleSubNutrientFields;

export interface MenuResponseDto extends MenuBaseFields, MenuNutrientFields {}

export interface SearchMenuRequestDto extends SearchInputField {
  limit: number;
  cursor?: number | null;
}

export type SearchRequestDto = SearchMenuRequestDto;

export interface SearchResponseDto {
  has_result: boolean;
  menu_list: MenuSimpleResponseDto[];
  next_cursor: number | null;
}

export interface SearchBrandResponseDto {
  brand_list: string[];
}

export type MenuIdRequestDto = MenuIdField;

export interface SearchInBrandRequestDto extends SearchInputField {
  brand: string;
}

export interface RegisterMealRequestDto extends DateField, MealTimeField {
  image?: string;
  menu_ids?: MenuId[];
  menu_quantities?: number[];
  menu_input_modes?: MealMenuInputMode[];
}

export interface DeleteMealRequestDto extends DateField, MealTimeField {
  menu_id?: MenuId;
}

export interface MealResponseDto extends MealTimeField {
  image: string;
  createdAt: string;
  updatedAt: string;
  menu_list: MenuSimpleResponseDto[];
  menu_quantities: number[];
  menu_input_modes: MealMenuInputMode[];
}

export interface MealRecordResponseDto {
  meal_list: MealResponseDto[];
}

export type DateRequestDto = DateField;

export interface MealRecordedDatesRequestDto {
  startDate: ApiDate;
  endDate: ApiDate;
}

export interface MealRecordedDatesResponseDto {
  "recorded-dates": ApiDate[];
}

export type RegisterMenuRequestDto = Pick<
  MenuBaseFields,
  "name" | "brand" | "unit" | "weight" | "calories"
> &
  MenuNutrientFields;

export interface ModifyMenuRequestDto extends RegisterMenuRequestDto, MenuIdField {}

export interface WeightStepsResponseDto {
  weight: number | null;
  steps: number;
}

export const MEAL_TYPE_OPTIONS = [
  { key: "0", label: "아침" },
  { key: "1", label: "점심" },
  { key: "2", label: "저녁" },
  { key: "3", label: "간식" },
  { key: "4", label: "야식" },
] as const;

export type MealType = (typeof MEAL_TYPE_OPTIONS)[number]["key"];
export type MealServingInputMode = "unit" | "weight";

type NullableMenuNutrientFields = {
  [K in keyof MenuNutrientFields]?: MenuNutrientFields[K] | null;
};

export type MealMenuItem = Omit<
  ApiMenuSimpleResponseDto,
  "brand" | "category" | "unit" | "weight" | keyof MenuSimpleSubNutrientFields
> &
  Partial<Pick<ApiMenuSimpleResponseDto, "brand" | "category" | "unit">> & {
    is_deleted?: number;
    weight?: MenuBaseFields["weight"] | null;
  } & NullableMenuNutrientFields & {
    serving_input_mode?: MealServingInputMode;
    serving_input_value?: number;
  };

export type MealPhotoGroup = {
  id: string;
  imageSrc: string;
  imageAlt: string;
  items: MealMenuItem[];
};

export const DEFAULT_MEAL_TYPE: MealType = "1";
export const MEAL_TYPE_SET: ReadonlySet<MealType> = new Set(
  MEAL_TYPE_OPTIONS.map((option) => option.key),
);

export type NutrientServingUnit = "g" | "ml";

// Profile
export type TargetRatio = [carb: number, protein: number, fat: number];
export interface ProfileResponseDto {
  user_id: number;
  nickname: string;
  name?: string; //소셜 프로필명
  role: string; //USER, ADMIN
  is_subscribed: boolean;
  gender: number;
  birthYear: number;
  height: number;
  weight: number;
  activity: number;
  goal: number;
  target_weight: number;
  target_calories: number;
  target_ratio: TargetRatio;
  diet_management_status?: number[];
  persona_type?: number;
  eating_out_freq_weekly?: number;
  job_type?: number;
  lunch_location?: number | null;
}
export interface UserGoalSnapshotResponseDto {
  id: number; //목표 스냅샷 id
  activity: number;
  goal: number;
  target_weight: number;
  target_calories: number;
  target_ratio: TargetRatio;
  createdAt: string; //스냅샷 생성 시각
}

// Chat
export interface ChatHistoryResponseDto {
  chat_list: ChatHistoryItemResponseDto[];
}

export interface ChatHistoryItemResponseDto {
  id: number; //채팅 기록 id
  input_text: string; //사용자 입력값
  image_url?: string | null; //사용자 입력 이미지
  createdAt: string; //저장 시각
  response_payload: ChatRecommendResponseDto;
  meal_record?: {
    time: MealTime;
    menu_ids?: MenuId[];
    menu_quantities?: number[];
    menu_input_modes?: MealMenuInputMode[];
  };
}

export type amount_preference_level = "light" | "regular" | "hearty";

export interface ChatRecommendItemResponseDto extends NullableMenuNutrientFields {
  menu_id: number;
  menu_name: string; //메뉴명
  brand?: string;
  unit: number;
  weight: number;
  unit_quantity: string;
  calories: number;
  data_source: number;
  score: number; //최종 점수
  rank?: number;
  one_line_summary: string;
  recommendation_reason: string;
}

export type ChatCategory = "recommendation" | "feedback" | "general";
interface ChatResponseBaseDto {
  chat_category: ChatCategory;
  intro_message: string;
  image_url?: string | null;
}

export type ChatRecommendResponseDto =
  | ChatRecommendationResponseDto
  | ChatFeedbackResponseDto
  | ChatGeneralResponseDto;

export interface ChatRecommendationResponseDto extends ChatResponseBaseDto {
  chat_category: "recommendation";
  recommendations: ChatRecommendItemResponseDto[];
  feedback?: never;
}

export interface ChatFeedbackResponseDto extends ChatResponseBaseDto {
  chat_category: "feedback";
  feedback: FeedbackDto;
  recognized_foods?: ChatFoodImageRecognizedMenuResponseDto[];
  recommendations?: never;
}

export interface ChatGeneralResponseDto extends ChatResponseBaseDto {
  chat_category: "general";
  general_answer: string;
  feedback?: never;
  recommendations?: never;
}

export interface FeedbackDto {
  menus: ChatFeedbackMenuResponseDto[];
  total_calories: number;
  score: number;
  is_appropriate: boolean;
}

export interface ChatFeedbackMenuResponseDto {
  input_menu_name: string;
  menu_id: number;
  menu_name: string;
  unit: number;
  weight: number;
  unit_quantity: string;
  calories: number;
  score: number;
  is_appropriate: boolean;
  data_source: number;
  brand?: string;
}

export interface ChatMenuBoardRecommendResponseDto {
  chat_category: "recommendation";
  intro_message: string;
  recommendations: ChatRecommendItemResponseDto[];
  recognized_candidates: ChatRecognizedCandidateResponseDto[];
}

export interface ChatRecognizedCandidateResponseDto {
  menu_id: number;
  menu: string;
  brand: string;
  category: string;
}

export interface ChatFoodImageFeedbackResponseDto {
  chat_category: "feedback";
  intro_message: string;
  feedback: FeedbackDto;
  recognized_foods: ChatFoodImageRecognizedMenuResponseDto[];
}

export interface ChatFoodImageRecognizedMenuResponseDto {
  menu_id: number;
  menu_name: string;
  brand?: string;
  category?: string;
  confidence?: number; //ai가 반환한 인식 신뢰도 0~1 정규화 값
  position: {
    x: number; //인식된 음식의 이미지 내 x 좌표 (0~1 정규화 값)
    y: number; //인식된 음식의 이미지 내 y 좌표 (0~1 정규화 값)
  };
}

// Camera
export interface FoodImageRecognitionResponseDto {
  menu_ids: number[];
  menu_quantities: number[];
  image_url: string;
}

export interface NutritionLabelRecognitionResponseDto {
  unit: number; //중량 단위 (0: g, 1: ml)
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
