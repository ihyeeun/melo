export function makeYearOptions({
  from,
  count,
}: {
  from: number; // 시작년도 (보통 현재년도)
  count: number; // 몇 년치 (보통 100~120)
}) {
  return Array.from({ length: count }, (_, i) => from - i);
}

type BirthYearRange = {
  min: number;
  max: number;
};

// 출생 연도는 현재년도-100부터 현재년도-15까지 고를 수 있다 (서비스 정책 P2)
export function getBirthYearRange(currentYear = new Date().getFullYear()): BirthYearRange {
  return {
    min: currentYear - 100,
    max: currentYear - 15,
  };
}

const DEFAULT_BIRTH_YEAR = 2000;

// 출생 연도 선택 시트를 열 때 처음 보일 연도. 범위 밖이면 가장 가까운 연도로 맞춘다
export function getBirthYearPickerStart(birthYear?: number) {
  const { min, max } = getBirthYearRange();
  return Math.min(Math.max(birthYear ?? DEFAULT_BIRTH_YEAR, min), max);
}

export function isValidBirthYear(year: number | undefined): year is number {
  if (typeof year !== "number" || !Number.isInteger(year)) return false;
  const { min, max } = getBirthYearRange();
  return year >= min && year <= max;
}
