export function getAge(birthYear: number) {
  return new Date().getFullYear() - birthYear - 1; // 만 나이 기준
}
