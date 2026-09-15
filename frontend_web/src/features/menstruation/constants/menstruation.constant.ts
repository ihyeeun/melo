type TitleValues = {
  menstrualDay: number | null;
  daysUntilNext: number | null;
};

const countdownTitle = ({ daysUntilNext }: TitleValues) =>
  daysUntilNext !== null && daysUntilNext > 0 ? `월경 ${daysUntilNext}일 전` : "월경 시작 예상";

const EMPTY_PHASE_CONTENT = {
  phaseIndex: -1,
  phaseLabel: "기록 전",
  title: () => "생리 기록을 시작해 볼까요?",
  message: "주기에 맞춰 식단과\n운동을 더 똑똑하게\n관리해봐요!",
  source: "/icons/characters/question-color.png",
} as const;

const MENSTRUAL_VIEW = {
  phaseIndex: 0,
  phaseLabel: "월경기",
  title: ({ menstrualDay }: TitleValues) =>
    menstrualDay !== null ? `월경 ${menstrualDay}일 차` : "월경 기록",
  message: "무리하지 말고,\n몸이 원하는 만큼만\n가볍게 움직여보세요.",
  source: "/icons/characters/menstruation.png",
} as const;

const FOLLICULAR_VIEW = {
  phaseIndex: 1,
  phaseLabel: "난포기",
  title: countdownTitle,
  message: "다이어트 황금기!\n에너지를 살려 계획했던\n루틴을 시작해 보세요.",
  source: "/icons/characters/follicular.png",
} as const;

const OVULATORY_VIEW = {
  phaseIndex: 2,
  phaseLabel: "배란기",
  title: countdownTitle,
  message: "곧 부종이나 식욕이\n늘어날 수 있는\n황체기가 시작돼요.",
  source: "/icons/characters/ovulatory.png",
} as const;

const LUTEAL_VIEW = {
  phaseIndex: 3,
  phaseLabel: "황체기",
  title: countdownTitle,
  message: "체중이 늘고 붓는 건\n자연스러운 현상이에요.\n자책은 금물!",
  source: "/icons/characters/luteal.png",
} as const;

const NEXT_MENSTRUAL_VIEW = {
  ...MENSTRUAL_VIEW,
  phaseIndex: 4,
  phaseLabel: "생리 예정",
  title: () => "월경 시작 예상",
} as const;

/** 계산 결과의 원본 status를 그대로 Home 콘텐츠와 step 위치에 연결한다. */
export const HOME_MENSTRUAL_STATUS_VIEW = {
  menstrual_recorded: MENSTRUAL_VIEW,
  follicular: FOLLICULAR_VIEW,
  ovulatory: OVULATORY_VIEW,
  luteal: LUTEAL_VIEW,
  next_predicted: NEXT_MENSTRUAL_VIEW,
  undefined: EMPTY_PHASE_CONTENT,
} as const;
