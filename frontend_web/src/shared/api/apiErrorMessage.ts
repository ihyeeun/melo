import type { ApiFailResponse } from "@/shared/api/types/apiResponse.types";

export const API_ERROR_MESSAGE = {
  DEFAULT: "요청 처리 중 오류가 발생했습니다",
  BAD_REQUEST: "입력값을 다시 확인해주세요",
  AUTH_EXPIRED: "로그인이 만료되었어요 다시 로그인해주세요",
  FORBIDDEN: "요청 권한이 없어요",
  NOT_FOUND: "요청한 정보를 찾지 못했어요",
  CONFLICT: "이미 처리된 요청이에요",
  NUTRIENT_RATIO_TOTAL: "탄단지 비율의 합을 100으로 맞춰주세요",
  SUB_CODE_REQUIRED: "구독 코드를 입력해주세요",
  SUB_CODE_INACTIVE: "사용 기간이 지났거나 비활성화된 구독 코드예요",
  IMAGE_REQUIRED: "이미지 파일이 누락되었어요",
  IMAGE_TYPE_INVALID: "지원하지 않는 이미지 형식이에요",
  FOOD_IMAGE_QUALITY_LOW: "사진 화질이 너무 낮아요",
  FOOD_IMAGE_TOO_SMALL: "사진 속 음식이 너무 작게 보여요",
  FOOD_IMAGE_BLURRY: "사진이 흐려요",
  FOOD_IMAGE_LIGHTING_POOR: "조명이 좋지 않아 인식하기 어려워요",
  FOOD_OCCLUDED_OR_CUT_OFF: "음식이 가려졌거나 잘려 있어요",
  FOOD_NOT_DETECTED: "사진에서 음식을 찾을 수 없어요",
  FOOD_NOT_MATCHED: "사진 속 음식이 후보 메뉴와 매칭되지 않았어요",
  ADMIN_ID_OR_EMAIL_INVALID: "아이디 또는 이메일을 다시 확인해주세요",
  KAKAO_AUTH_FAILED: "카카오 인증에 실패했어요 다시 로그인해주세요",
  APPLE_AUTH_FAILED: "Apple 인증에 실패했어요 다시 로그인해주세요",
  USER_AUTH_REQUIRED: "회원 인증이 필요해요 다시 로그인해주세요",
  SUB_CODE_NOT_FOUND: "존재하지 않는 구독 코드예요",
  USER_INFO_NOT_FOUND: "회원 정보를 찾지 못했어요",
  MEAL_NOT_FOUND: "식사를 찾지 못했어요",
  MENU_NOT_FOUND: "메뉴 정보를 찾지 못했어요",
  PROFILE_ALREADY_EXISTS: "이미 등록된 프로필이 있어요",
  SUB_CODE_ALREADY_EXISTS: "이미 등록한 구독 코드예요",
  SUB_CODE_LIMIT_EXCEEDED: "사용 한도가 초과된 구독 코드예요",
  REQUEST_TIMEOUT: "요청 시간이 초과되었습니다 잠시 후 다시 시도해주세요",
  NETWORK_ERROR: "서버에 연결할 수 없어요 네트워크 상태를 확인해주세요",
  SERVICE_UNAVAILABLE: "서버가 일시적으로 불안정해요 잠시 후 다시 시도해주세요",
} as const;

type ApiErrorUserMessageRule = {
  statusCode: number;
  messages?: string[];
  userMessage?: string;
};

const API_ERROR_USER_MESSAGE_RULES: ApiErrorUserMessageRule[] = [
  {
    statusCode: 400,
    userMessage: API_ERROR_MESSAGE.BAD_REQUEST,
  },
  {
    statusCode: 401,
    userMessage: API_ERROR_MESSAGE.AUTH_EXPIRED,
  },
  {
    statusCode: 403,
    userMessage: API_ERROR_MESSAGE.FORBIDDEN,
  },
  {
    statusCode: 404,
    userMessage: API_ERROR_MESSAGE.NOT_FOUND,
  },
  {
    statusCode: 409,
    userMessage: API_ERROR_MESSAGE.CONFLICT,
  },
  {
    statusCode: 503,
    userMessage: API_ERROR_MESSAGE.SERVICE_UNAVAILABLE,
  },
  {
    statusCode: 40010,
    messages: ["ratio sum must be 100"],
    userMessage: API_ERROR_MESSAGE.NUTRIENT_RATIO_TOTAL,
  },
  {
    statusCode: 40012,
    messages: ["subCode must not be empty", "subCode should not be empty"],
    userMessage: API_ERROR_MESSAGE.SUB_CODE_REQUIRED,
  },
  {
    statusCode: 40013,
    messages: ["Subscription code is not active"],
    userMessage: API_ERROR_MESSAGE.SUB_CODE_INACTIVE,
  },
  {
    statusCode: 40050,
    messages: ["image file is required"],
    userMessage: API_ERROR_MESSAGE.IMAGE_REQUIRED,
  },
  {
    statusCode: 40051,
    messages: ["image file must be an image"],
    userMessage: API_ERROR_MESSAGE.IMAGE_TYPE_INVALID,
  },
  {
    statusCode: 40052,
    messages: ["food image quality is too low"],
    userMessage: API_ERROR_MESSAGE.FOOD_IMAGE_QUALITY_LOW,
  },
  {
    statusCode: 40053,
    messages: ["food in image is too small"],
    userMessage: API_ERROR_MESSAGE.FOOD_IMAGE_TOO_SMALL,
  },
  {
    statusCode: 40054,
    messages: ["food image is too blurry"],
    userMessage: API_ERROR_MESSAGE.FOOD_IMAGE_BLURRY,
  },
  {
    statusCode: 40055,
    messages: ["food image lighting is too poor"],
    userMessage: API_ERROR_MESSAGE.FOOD_IMAGE_LIGHTING_POOR,
  },
  {
    statusCode: 40056,
    messages: ["food is occluded or cut off"],
    userMessage: API_ERROR_MESSAGE.FOOD_OCCLUDED_OR_CUT_OFF,
  },
  {
    statusCode: 40057,
    messages: ["no food detected in image"],
    userMessage: API_ERROR_MESSAGE.FOOD_NOT_DETECTED,
  },
  {
    statusCode: 40058,
    messages: ["no recognizable menu matched candidates"],
    userMessage: API_ERROR_MESSAGE.FOOD_NOT_MATCHED,
  },
  {
    statusCode: 40410,
    messages: ["Subscription code not found"],
    userMessage: API_ERROR_MESSAGE.SUB_CODE_NOT_FOUND,
  },
  {
    statusCode: 40411,
    messages: ["User info not found"],
    userMessage: API_ERROR_MESSAGE.USER_INFO_NOT_FOUND,
  },
  {
    statusCode: 40420,
    messages: ["Meal not found"],
    userMessage: API_ERROR_MESSAGE.MEAL_NOT_FOUND,
  },
  {
    statusCode: 40420,
    messages: ["Menu not found"],
    userMessage: API_ERROR_MESSAGE.MENU_NOT_FOUND,
  },
  {
    statusCode: 409,
    messages: ["Your profile already exists"],
    userMessage: API_ERROR_MESSAGE.PROFILE_ALREADY_EXISTS,
  },
  {
    statusCode: 40910,
    messages: ["Your subCode already exists"],
    userMessage: API_ERROR_MESSAGE.SUB_CODE_ALREADY_EXISTS,
  },
  {
    statusCode: 40911,
    messages: ["Subscription code usage limit exceeded"],
    userMessage: API_ERROR_MESSAGE.SUB_CODE_LIMIT_EXCEEDED,
  },
];

const API_ERROR_USER_MESSAGE_BY_ERROR_CODE: Record<string, string> = {
  NETWORK_ERROR: API_ERROR_MESSAGE.NETWORK_ERROR,
  REQUEST_TIMEOUT: API_ERROR_MESSAGE.REQUEST_TIMEOUT,
};

const API_ERROR_USER_MESSAGE_BY_CUSTOM_STATUS_CODE: Partial<Record<number, string>> = {
  40010: API_ERROR_MESSAGE.NUTRIENT_RATIO_TOTAL,
  40012: API_ERROR_MESSAGE.SUB_CODE_REQUIRED,
  40013: API_ERROR_MESSAGE.SUB_CODE_INACTIVE,
  40410: API_ERROR_MESSAGE.SUB_CODE_NOT_FOUND,
  40910: API_ERROR_MESSAGE.SUB_CODE_ALREADY_EXISTS,
  40911: API_ERROR_MESSAGE.SUB_CODE_LIMIT_EXCEEDED,
};

export function resolveApiErrorMessage(response: ApiFailResponse) {
  const matchedRule = API_ERROR_USER_MESSAGE_RULES.find((rule) =>
    rule.messages?.includes(response.message),
  );
  const matchedStatusRule = API_ERROR_USER_MESSAGE_RULES.find(
    (rule) => rule.messages === undefined && rule.statusCode === response.statusCode,
  );
  const resolvedMessage =
    matchedRule?.userMessage ??
    matchedStatusRule?.userMessage ??
    API_ERROR_USER_MESSAGE_BY_CUSTOM_STATUS_CODE[response.statusCode] ??
    API_ERROR_USER_MESSAGE_BY_ERROR_CODE[response.error] ??
    response.message;

  return resolvedMessage || API_ERROR_MESSAGE.DEFAULT;
}
