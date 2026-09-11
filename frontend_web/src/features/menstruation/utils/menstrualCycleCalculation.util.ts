interface MenstrualPhaseDurations {
  menstrual: number;
  follicular: number;
  ovulatory: number;
  luteal: number;
}

/** 월경 주기 기본 값 */
const CYCLE_LEN = 28;
/** 배란기 기본 값 */
const OVULATORY = 3;
/** 황체기 기본 값 */
const LUTEAL = 13;

/** context가 선택한 최근 정상 간격(최대 6개)의 평균. 2개 미만이면 기본 28일이다. */
export function calculateAverageCycleLength(validIntervals: readonly number[]): number {
  if (validIntervals.length < 2) return CYCLE_LEN;
  const average = validIntervals.reduce((sum, days) => sum + days, 0) / validIntervals.length;
  return Math.round(average);
}

/** 실제 월경 또는 예상 표시의 일수와 회차 길이로 단계별 기간을 구한다. */
export function calculateMenstrualPhaseDurations(
  menstrual: number,
  averageCycleLength: number,
): MenstrualPhaseDurations {
  // 월경기 이후 남는 일수 N-M : R
  const remainingCycleLen = averageCycleLength - menstrual;

  // 난포기, 배란기, 황체기
  let follicular = 0;
  let ovulatory = 0;
  let luteal = 0;

  if (remainingCycleLen >= OVULATORY + LUTEAL) {
    luteal = LUTEAL;
    ovulatory = OVULATORY;
    follicular = remainingCycleLen - luteal - ovulatory;
  } else if (remainingCycleLen >= 0) {
    luteal = remainingCycleLen;
  } // 음수인 경우에는 난포기, 배란기, 황체기를 0일로 유지한다.

  return { menstrual, follicular, ovulatory, luteal };
}
