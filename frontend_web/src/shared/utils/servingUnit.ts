import { formatDisplayNumber } from "@/shared/utils/numberFormat";

export const SERVING_UNIT_PERSON = "인분";
export const SERVING_UNIT_STANDARD = "기준량";

export function getServingUnitLabel(unitQuantity?: string | null) {
  return unitQuantity?.trim() === SERVING_UNIT_PERSON ? SERVING_UNIT_PERSON : SERVING_UNIT_STANDARD;
}

export function formatBaseServingUnit(unitQuantity?: string | null) {
  return `1${getServingUnitLabel(unitQuantity)}`;
}

export function convertUnitNumToString(unit: number) {
  return unit === 0 ? "g" : "ml";
}

type ServingBasis = {
  /** 원본 기준 중량. 변환할 중량과 같은 단위여야 합니다. */
  baseWeight: number;
  /** 원본 중량에 해당하는 인분 수. 기본값은 1입니다. */
  baseServingCount?: number;
};

/** 중량 → 인분 수. 유효하지 않은 값이면 null을 반환합니다. */
export function convertWeightToServingCount({
  baseWeight,
  consumedWeight,
  baseServingCount = 1,
}: ServingBasis & { consumedWeight: number }): string | null {
  if (
    !Number.isFinite(baseWeight) ||
    baseWeight <= 0 ||
    !Number.isFinite(baseServingCount) ||
    baseServingCount <= 0 ||
    !Number.isFinite(consumedWeight) ||
    consumedWeight < 0
  ) {
    return null;
  }

  const servingCount = (consumedWeight / baseWeight) * baseServingCount;
  return Number.isFinite(servingCount) ? formatDisplayNumber(servingCount) : null;
}

/** 인분 수 → 중량. 유효하지 않은 값이면 null을 반환합니다. */
export function convertServingCountToWeight({
  baseWeight,
  servingCount,
  baseServingCount = 1,
}: ServingBasis & { servingCount: number }): string | null {
  if (
    !Number.isFinite(baseWeight) ||
    baseWeight <= 0 ||
    !Number.isFinite(baseServingCount) ||
    baseServingCount <= 0 ||
    !Number.isFinite(servingCount) ||
    servingCount < 0
  ) {
    return null;
  }

  const weight = (servingCount / baseServingCount) * baseWeight;
  return Number.isFinite(weight) ? formatDisplayNumber(weight) : null;
}
