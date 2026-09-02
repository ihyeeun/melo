import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";

export const MENSTRUAL_PHASE_ORDER = [
  "menstrual_recorded",
  "follicular",
  "ovulatory",
  "luteal",
] as const;

type VisibleMenstrualStatus = Exclude<MenstrualStatus, undefined>;

type HomeMenstrualStatusView = {
  phaseIndex: number;
  phaseLabel: string;
  title: string;
  message: string;
  source: string;
};

const MENSTRUAL_VIEW = {
  phaseIndex: 0,
  phaseLabel: "월경기",
  title: "휴식기",
  message: "무리하지 말고,\n몸이 원하는 만큼만\n가볍게 움직여보세요.",
  source: "/icons/characters/menstruation.png",
} as const;

const FOLLICULAR_VIEW = {
  phaseIndex: 1,
  phaseLabel: "난포기",
  title: "황금기",
  message: "다이어트 황금기!\n에너지를 살려 계획했던\n루틴을 시작해 보세요.",
  source: "/icons/characters/follicular.png",
} as const;

const OVULATORY_VIEW = {
  phaseIndex: 2,
  phaseLabel: "배란기",
  title: "전환기",
  message: "곧 부종이나 식욕이\n늘어날 수 있는\n황체기가 시작돼요.",
  source: "/icons/characters/ovulatory.png",
} as const;

const LUTEAL_VIEW = {
  phaseIndex: 3,
  phaseLabel: "황체기",
  title: "유지기",
  message: "체중이 늘고 붓는 건\n자연스러운 현상이에요.\n자책은 금물!",
  source: "/icons/characters/luteal.png",
} as const;

/** 계산 결과의 원본 status를 그대로 Home 콘텐츠와 step 위치에 연결한다. */
export const HOME_MENSTRUAL_STATUS_VIEW = {
  menstrual_recorded: MENSTRUAL_VIEW,
  menstrual_predicted: MENSTRUAL_VIEW,
  follicular: FOLLICULAR_VIEW,
  ovulatory: OVULATORY_VIEW,
  luteal: LUTEAL_VIEW,
  next_possible: LUTEAL_VIEW,
  next_predicted: LUTEAL_VIEW,
} as const satisfies Record<VisibleMenstrualStatus, HomeMenstrualStatusView>;

export const HOME_DELAYED_CONTENT = {
  phaseLabel: "생리 예정",
  title: "지연 중",
  message: "생리가 시작되면\n기록으로 알려주세요!",
  source: "/icons/characters/question-color.png",
} as const;
