import type { RecentAnalysisRequestDto } from "@/shared/api/types/api.request.dto";

// 분석 그래프의 생리 주기 배경 표시 여부를 기기에 기억하는 키. 로그아웃·탈퇴 때 지운다
export const MENSTRUAL_PHASE_SETTING_STORAGE_KEY = "analysis-menstrual-phase";

export const personalAnalysisKeys = {
  all: ["recent-analysis"],
  mode: ({ date, mode }: RecentAnalysisRequestDto) =>
    [...personalAnalysisKeys.all, mode, date] as const,
};
