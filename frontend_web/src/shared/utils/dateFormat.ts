// Date를 YYYY-MM-DD 형태의 문자열로 변경
export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayFormatDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 4-2-2 형식인지 체크하는 함수
export function isValidDateKey(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function parseDateKey(dateKey: string) {
  if (!isValidDateKey(dateKey)) {
    return new Date();
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// 문자열 날짜를 Date 객체로 변환
export function parseDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

// Date 객체를 "YYYY년 M월 D일 요일" 형식의 문자열로 변환
export function formatDateDividerText(date: Date) {
  const weekday = date.toLocaleDateString("ko-KR", {
    weekday: "long",
  });

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
}
