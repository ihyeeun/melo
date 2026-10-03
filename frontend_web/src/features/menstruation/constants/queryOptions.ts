/** 기록 저장으로 무효화할 때 갱신한다. 화면을 벗어나도 앱 메모리에 조회 이력을 유지한다. */
export const MENSTRUAL_RECORD_CACHE_OPTIONS = {
  staleTime: Infinity,
  gcTime: Infinity,
  meta: { refetchOnResume: "stale" },
} as const;
