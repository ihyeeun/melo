const AVERAGE_STRIDE = 0.41;

export function calculateActivityCalories({
  weightKg,
  heightCm,
  stepCount,
  age,
}: {
  weightKg: number;
  heightCm: number;
  stepCount: number;
  age: number;
}) {
  // step 1. 거리 계산
  const stride = heightCm * AVERAGE_STRIDE;
  const walkingDistanceKm = (stepCount * stride) / 100000;

  // step 2. 시간 계산
  const walkingHour = walkingDistanceKm / averageWalkingSpeedKmHour(age);

  // step 3. kcal 계산
  const kcal = 2.3 * weightKg * walkingHour;

  // 최종 결과는 반올림하여 정수로 저장
  return Math.round(kcal);
}

function averageWalkingSpeedKmHour(age: number) {
  let speedKmHour = 0;

  switch (true) {
    case age < 30:
      speedKmHour = 4.82;
      break;
    case age <= 39:
      speedKmHour = 4.54;
      break;
    case age <= 49:
      speedKmHour = 4.54;
      break;
    case age <= 59:
      speedKmHour = 4.43;
      break;
    default:
      speedKmHour = 4.34;
      break;
  }

  return speedKmHour;
}
