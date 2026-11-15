import { isToday } from "date-fns";

import { parseDateKey } from "@/shared/utils/dateFormat";

export function formatWorkoutDuration(minutes: number | null | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) {
    return "0분";
  }

  // 운동 시간은 반올림한 정수 분으로 보여 준다(수치 표시 정책)
  const normalizedMinutes = Math.round(minutes);

  if (normalizedMinutes < 60) {
    return `${normalizedMinutes}분`;
  }

  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;

  return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

// 고른 날짜 기준 제목. 오늘이 아니면 'M월 D일'로 쓴다
export function getWorkoutDayTitles(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (isToday(date)) return { summary: "오늘 운동 요약", list: "오늘 한 운동" };

  const dayText = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  return { summary: `${dayText} 운동 요약`, list: `${dayText}에 한 운동` };
}
