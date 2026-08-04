export function formatWorkoutDuration(minutes: number | null | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) {
    return "0분";
  }

  const normalizedMinutes = Math.trunc(minutes);

  if (normalizedMinutes < 60) {
    return `${normalizedMinutes}분`;
  }

  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;

  return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}
