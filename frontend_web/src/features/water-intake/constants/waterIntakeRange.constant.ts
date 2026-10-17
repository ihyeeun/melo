/** 물 섭취량 기본 단위 값 : ml */
const WATER_UNIT = 100;

/** 물컵 시각화가 가득 차는 용량. 실제 기록 상한과는 별개예요. */
export const WATER_GLASS_CAPACITY_ML = 2000;

/** 물 섭취량 최대 : 10L, 최소: 0L */
export const WATER_INTAKE_SIZE = {
  MAX: 10 * 10 * WATER_UNIT,
  MIN: 0,
};

/** 물 컵 사이즈 최대 : 1000ml, 최소: 50ml */
export const WATER_CUP_SIZE = {
  MAX: 10 * WATER_UNIT,
  MIN: 50,
};
