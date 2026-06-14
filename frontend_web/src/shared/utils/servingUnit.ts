const SERVING_UNIT_PERSON = "인분";
const SERVING_UNIT_STANDARD = "기준량";

export function getServingUnitLabel(unitQuantity?: string | null) {
  return unitQuantity?.trim() === SERVING_UNIT_PERSON ? SERVING_UNIT_PERSON : SERVING_UNIT_STANDARD;
}

export function formatBaseServingUnit(unitQuantity?: string | null) {
  return `1${getServingUnitLabel(unitQuantity)}`;
}
