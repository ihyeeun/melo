import type { MenstrualPhase } from "@/features/menstruation/types/menstruation.type";

export const MENSTRUAL_PHASE_ORDER = [
  "MENSTRUAL",
  "FOLLICULAR",
  "OVULATORY",
  "LUTEAL",
] as const satisfies readonly MenstrualPhase[];

export const HOME_PHASE_CONTENT = {
  MENSTRUAL: {
    phaseLabel: "월경기",
    title: "휴식기",
    message: "무리하지 말고,\n몸이 원하는 만큼만\n가볍게 움직여보세요.",
    source: "/icons/characters/menstruation.png",
  },

  FOLLICULAR: {
    phaseLabel: "난포기",
    title: "황금기",
    message: "다이어트 황금기!\n에너지를 살려 계획했던\n루틴을 시작해 보세요.",
    source: "/icons/characters/follicular.png",
  },

  OVULATORY: {
    phaseLabel: "배란기",
    title: "전환기",
    message: "곧 부종이나 식욕이\n늘어날 수 있는\n황체기가 시작돼요.",
    source: "/icons/characters/ovulatory.png",
  },

  LUTEAL: {
    phaseLabel: "황체기",
    title: "유지기",
    message: "체중이 늘고 붓는 건\n자연스러운 현상이에요.\n자책은 금물!",
    source: "/icons/characters/luteal.png",
  },
} as const satisfies Record<
  MenstrualPhase,
  {
    phaseLabel: string;
    title: string;
    message: string;
    source: string;
  }
>;

export const HOME_DELAYED_CONTENT = {
  phaseLabel: "지연 중",
  title: "지연 중",
  message: "생리가 시작되면\n기록으로 알려주세요!",
  source: "/icons/characters/luteal.png",
} as const;
