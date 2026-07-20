/* ======
 * 유저 인증
 * ====== */
export interface UserTokenResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    nickname: string;
    name: string;
    email: string;
    platform: string;
    role: string;
    is_subscribed: boolean;
  };
}

export interface UserInfoResponseDto {
  nickname: string;
  name?: string;
  email: string;
  gender: number;
  birthYear: number;
  height: number;
  weight: number;
  activity: number;
  goal: number;
  target_weight: number;
  target_calories: number;
  target_ratio: number[];
  subCode?: string;
  diet_management_status?: number[];
  persona_type?: number;
  eating_out_freq_weekly?: number;
  job_type?: number;
  lunch_location?: number | null;
  is_subscribed: boolean;
}

/* ======
 * 홈 탭
 * ====== */
export interface SearchResponseDto {
  has_result: boolean;
  menu_list: MenuSimpleResponseDto[];
  next_cursor?: number;
}

export interface MenuSimpleResponseDto {
  id: number;
  data_source: number;
  name: string;
  brand: string;
  category: string;
  unit: number;
  weight: number;
  unit_quantity: string;
  calories: number;
  carbs: number;
  sugars?: number;
  protein: number;
  fat: number;
  sat_fat?: number;
  trans_fat?: number;
  un_sat_fat?: number;
}

export interface SearchBrandResponseDto {
  brand_list: string[];
}

export interface MenuResponseDto {
  id: number;
  data_source: number;
  name: string;
  brand: string;
  category: string;
  unit: number;
  weight: number;
  unit_quantity: string;
  calories: number;
  carbs: number;
  sugars: number;
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

export interface NutritionLabelRecognitionResponseDto {
  unit: number;
  weight: number;
  calories: number;
  carbs: number;
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

export interface FoodImageRecognitionResponseDto {
  menu_ids: number[];
  menu_quantities: number[];
  image_url: string;
}

export interface MealRecordResponseDto {
  meal_list: MealResponseDto[];
}

export interface MealResponseDto {
  time: number;
  meal_time?: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  menu_list: MenuSimpleResponseDto[];
  menu_quantities: number[];
  menu_input_modes: number[];
}

export interface MealRecordedDatesResponseDto {
  "recorded-dates": string[];
}

export interface WeightStepsResponseDto {
  weight: number | null;
  steps: number | null;
}

export interface MenuListResponseDto {
  menu_list: MenuSimpleResponseDto[];
}

export interface FolderListResponseDto {
  folder_list: FolerListItemResponseDto[];
  next_cursor?: number;
}

export interface FolerListItemResponseDto {
  folder_id: number;
  folder_name: string;
  menu_names: string[];
}

export interface FolderDetailResponseDto {
  folder_name: string;
  menu_list: MenuSimpleResponseDto[];
  menu_quantities: number[];
  menu_input_modes: Array<0 | 1>;
}

/* ======
 * 채팅
 * ====== */
export type ChatRecommendResponseDto =
  | ChatRecommendationResponseDto
  | ChatFeedbackResponseDto
  | ChatNutritionLabelFeedbackResponseDto
  | ChatNutritionLabelMenuRegisteredResponseDto
  | ChatGeneralResponseDto
  | ChatMealRecordParseResponseDto;

interface ChatResponseBaseDto {
  chat_category: "recommendation" | "feedback" | "general" | "meal_record_parse";
  intro_message?: string;
  image_url?: string | null;
}

export interface ChatRecommendationResponseDto extends ChatResponseBaseDto {
  chat_category: "recommendation";
  recommendations?: ChatRecommendItemResponseDto[];
}

export interface ChatFeedbackResponseDto extends ChatResponseBaseDto {
  chat_category: "feedback";
  feedback?: FeedbackItemDto;
  recognized_foods?: ChatFoodImageRecognizedMenuResponseDto[];
}

export interface ChatGeneralResponseDto extends ChatResponseBaseDto {
  chat_category: "general";
  general_answer?: string;
}

export interface ChatMealRecordParseResponseDto extends ChatResponseBaseDto {
  chat_category: "meal_record_parse";
  meal_record_parse?: {
    date?: string;
    time?: 0 | 1 | 2 | 3 | 4;
    menu_ids: number[];
    parsed_items: Array<{
      name: string;
      brand?: string;
      category: string;
      quantityG: number;
    }>;
    matched_menus: Array<{
      menu_id: number;
      menu_name: string;
      quantity_g: number;
      input_menu_name: string;
    }>;
    menu_quantities: number[];
  };
}

export interface ChatNutritionLabelFeedbackResponseDto extends ChatResponseBaseDto {
  chat_category: "feedback";
  image_summary: string;
  menu_id?: number;
  registered_menu?: ChatNutritionLabelRegisteredMenuDto | null;
  recognized_nutrition: NutritionLabelRecognitionResponseDto;
  feedback?: never;
  recognized_foods?: never;
}

export interface ChatNutritionLabelMenuRegisteredResponseDto extends ChatResponseBaseDto {
  chat_category: "feedback";
  action: "nutrition_label_menu_registered";
  brand?: string | null;
  menu_id: number;
  menu_name: string;
  registered_menu?: ChatNutritionLabelRegisteredMenuDto | null;
  recognized_nutrition: NutritionLabelRecognitionResponseDto;
  feedback?: never;
  recognized_foods?: never;
}

export interface ChatNutritionLabelRegisteredMenuDto {
  brand?: string | null;
  menu_id: number;
  menu_name: string;
  registered_nutrition: NutritionLabelRecognitionResponseDto;
}

export interface ChatRecommendItemResponseDto {
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
}

export interface FeedbackItemDto {
  menus: ChatFeedbackMenuResponseDto[];
  total_calories: number;
  score: number;
  is_appropriate: boolean;
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

export interface ChatFeedbackMenuResponseDto {
  input_menu_name: string;
  menu_id: number;
  menu_name: string;
  brand?: string;
  unit: number;
  weight: number;
  unit_quantity: string;
  calories: number;
  score: number;
  is_appropriate: boolean;
  data_source: number;
}

export interface ChatHistoryResponseDto {
  chat_list: ChatHistoryItemResponseDto[];
}

export interface ChatHistoryItemResponseDto {
  id: number; //채팅 기록 id
  input_text: string; //사용자 입력값
  createdAt: string; //저장 시각
  response_payload: ChatRecommendResponseDto;
  image_url?: string | null; //사용자 입력 이미지
  meal_record?: {
    time: number;
    menu_ids?: number[];
    menu_quantities?: number[];
    menu_input_modes?: number[];
  };
}

export interface ChatMealRecordParseResponseDto {
  chat_id: number;
  menu_ids: number[];
  menu_quantities: number[];
  time?: 0 | 1 | 2 | 3 | 4;
  date?: string;
}

export interface ChatUserMenuSearchResponseDto {
  name: string[];
}

/* ======
 * 프로필
 * ====== */
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
  target_ratio: number[];
  diet_management_status?: number[];
  persona_type?: number;
  eating_out_freq_weekly?: number;
  job_type?: number;
  lunch_location?: number | null;
}
