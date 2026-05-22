export const toOneDecimalPlace = (num: number) => {
  return Math.round(num * 10) / 10;
};

export function formatNumberWithMaxOneDecimal(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  });
}
