import { Tabs } from "@base-ui/react";
import { useEffect, useMemo, useState } from "react";

import { NutrientDetailList } from "@/features/meal-record/components/NutrientDetailList";
import { NUTRIENT_DETAIL_INFO_MESSAGES } from "@/features/meal-record/constants/nutrientInfoMessages";
import styles from "@/features/meal-record/styles/MealMenuNutrientDetail.module.css";
import {
  formatNutrientValue,
  type MainNutrientKey,
  type NutrientValues,
  resolveMainNutrientStates,
  roundDecimal,
  scaleNutrientValue,
  scaleRequiredValue,
  toNullableNumber,
} from "@/features/meal-record/utils/nutrientDetail";
import {
  type MealMenuItem,
  type MealServingInputMode,
  MENU_NUTRIENT_FIELD_KEYS,
  MENU_UNIT,
} from "@/shared/api/types/api.dto";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
import { formatBaseServingUnit, getServingUnitLabel } from "@/shared/utils/servingUnit";

export type MealMenuNutrientSelection = {
  menu: MealMenuItem;
  quantity: number;
  mode: MealServingInputMode;
};

type MealMenuNutrientDetailProps = {
  menu: MealMenuItem;
  initialQuantity?: number;
  initialMode?: MealServingInputMode;
  isDetailOpen: boolean;
  onToggleDetail: () => void;
  onSelectionChange?: (selection: MealMenuNutrientSelection | null) => void;
  onEditAndAdd?: () => void;
  showEditSection?: boolean;
  detailListId?: string;
};

const DEFAULT_QUANTITY = 1;
const MIN_QUANTITY = 0.1;
const MAX_QUANTITY = 9999.9;
const QUANTITY_STEP = 0.5;
const QUANTITY_STEP_BASE = 0;
const QUANTITY_INPUT_PATTERN = /^\d{0,4}(?:\.\d?)?$/;
const UNIT_QUANTITY_PATTERN = /^\s*([\d.]+)\s*[^()]*\(([^)]+)\)\s*$/i;
const WEIGHT_TOKEN_PATTERN = /([\d.]+)\s*(g|ml)\b/i;
const SUMMARY_MACROS: ReadonlyArray<{ key: MainNutrientKey; label: string }> = [
  { key: "carbs", label: "탄수화물" },
  { key: "protein", label: "단백질" },
  { key: "fat", label: "지방" },
];

type SummaryMacroItem = (typeof SUMMARY_MACROS)[number] & {
  showWarning: boolean;
  value: number;
};

type ParsedServingContext = {
  baseUnitCount: number;
  baseWeight: number;
  weightUnit: "g" | "ml";
};

type ResolvedServingValues = {
  unitCount: number;
  totalWeight: number;
  scaleFactor: number;
};

function toPositiveNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function clampQuantityValue(value: number) {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, roundDecimal(value, 1)));
}

function getSteppedQuantity(currentValue: number, direction: -1 | 1) {
  const stepOffset = (currentValue - QUANTITY_STEP_BASE) / QUANTITY_STEP;
  const nextStepCount =
    direction > 0
      ? Math.floor(stepOffset + Number.EPSILON) + 1
      : Math.ceil(stepOffset - Number.EPSILON) - 1;
  const nextValue = QUANTITY_STEP_BASE + nextStepCount * QUANTITY_STEP;
  return clampQuantityValue(nextValue);
}

function isQuantityInputAllowed(inputValue: string) {
  const normalized = inputValue.trim();
  if (normalized === "") {
    return true;
  }

  if (!QUANTITY_INPUT_PATTERN.test(normalized)) {
    return false;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return false;
  }

  return numeric <= MAX_QUANTITY;
}

function parseServingContext(menu: MealMenuItem): ParsedServingContext {
  const unitQuantityText = menu.unit_quantity ?? "";
  const unitQuantityMatch = unitQuantityText.match(UNIT_QUANTITY_PATTERN);
  const weightToken =
    unitQuantityMatch?.[2]?.match(WEIGHT_TOKEN_PATTERN) ??
    unitQuantityText.match(WEIGHT_TOKEN_PATTERN);

  const parsedBaseUnitCount = unitQuantityMatch
    ? toPositiveNumber(Number(unitQuantityMatch[1]))
    : null;
  const parsedBaseWeight = weightToken ? toPositiveNumber(Number(weightToken[1])) : null;
  const fallbackWeightUnit = menu.unit === MENU_UNIT.MILLILITER ? "ml" : "g";
  const parsedWeightUnit = weightToken?.[2]?.toLowerCase() === "ml" ? "ml" : fallbackWeightUnit;

  return {
    baseUnitCount: parsedBaseUnitCount ?? DEFAULT_QUANTITY,
    baseWeight: toPositiveNumber(menu.weight) ?? parsedBaseWeight ?? DEFAULT_QUANTITY,
    weightUnit: parsedWeightUnit,
  };
}

function resolveServingValues(
  serving: ParsedServingContext,
  mode: MealServingInputMode,
  inputValue: number,
): ResolvedServingValues {
  if (mode === "unit") {
    const scaleFactor = inputValue / serving.baseUnitCount;
    return {
      unitCount: roundDecimal(inputValue, 1),
      totalWeight: roundDecimal(serving.baseWeight * scaleFactor, 1),
      scaleFactor,
    };
  }

  const scaleFactor = inputValue / serving.baseWeight;
  return {
    unitCount: roundDecimal(serving.baseUnitCount * scaleFactor, 1),
    totalWeight: roundDecimal(inputValue, 1),
    scaleFactor,
  };
}

function getModeFallbackValue(
  serving: ParsedServingContext,
  mode: MealServingInputMode,
  fallbackConsumedWeight: number,
) {
  if (mode === "weight") {
    return fallbackConsumedWeight;
  }

  const scaleFactor = fallbackConsumedWeight / serving.baseWeight;
  return roundDecimal(serving.baseUnitCount * scaleFactor, 1);
}

export function MealMenuNutrientDetail({
  menu,
  initialQuantity,
  initialMode,
  isDetailOpen,
  onToggleDetail,
  onSelectionChange,
  onEditAndAdd,
  showEditSection = true,
  detailListId = "meal-record-detail-list",
}: MealMenuNutrientDetailProps) {
  const servingContext = useMemo(() => parseServingContext(menu), [menu]);
  const servingBaseUnitCount = servingContext.baseUnitCount;
  const servingBaseWeight = servingContext.baseWeight;
  const servingWeightUnit = servingContext.weightUnit;

  const fallbackConsumedWeight = useMemo(() => {
    const selectedConsumedWeight = toPositiveNumber(initialQuantity);
    if (selectedConsumedWeight !== null) {
      return selectedConsumedWeight;
    }

    const storedServingValue = toPositiveNumber(menu.serving_input_value);
    if (storedServingValue !== null) {
      if (menu.serving_input_mode === "weight") {
        return storedServingValue;
      }

      return resolveServingValues(servingContext, "unit", storedServingValue).totalWeight;
    }

    return servingContext.baseWeight;
  }, [initialQuantity, menu.serving_input_mode, menu.serving_input_value, servingContext]);

  const menuInitialMode: MealServingInputMode =
    menu.serving_input_mode === "weight" ? "weight" : "unit";
  const fallbackMode: MealServingInputMode =
    initialMode === "weight" || initialMode === "unit" ? initialMode : menuInitialMode;

  const [inputMode, setInputMode] = useState<MealServingInputMode>(fallbackMode);
  const [quantityInput, setQuantityInput] = useState<number | undefined>(() => {
    return clampQuantityValue(
      getModeFallbackValue(servingContext, fallbackMode, fallbackConsumedWeight),
    );
  });

  useEffect(() => {
    // Keep local state in sync when incoming menu/selection context changes.
    const nextFallbackValue = getModeFallbackValue(
      {
        baseUnitCount: servingBaseUnitCount,
        baseWeight: servingBaseWeight,
        weightUnit: servingWeightUnit,
      },
      fallbackMode,
      fallbackConsumedWeight,
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputMode(fallbackMode);
    setQuantityInput(clampQuantityValue(nextFallbackValue));
  }, [
    fallbackMode,
    fallbackConsumedWeight,
    menu.id,
    servingBaseUnitCount,
    servingBaseWeight,
    servingWeightUnit,
  ]);

  const quantity = useMemo(() => toPositiveNumber(quantityInput), [quantityInput]);
  const resolvedServing = useMemo(() => {
    if (quantity === null) {
      return null;
    }

    const resolved = resolveServingValues(servingContext, inputMode, quantity);
    if (!Number.isFinite(resolved.scaleFactor) || resolved.scaleFactor <= 0) {
      return null;
    }

    return resolved;
  }, [inputMode, quantity, servingContext]);

  const nutrientValues = useMemo<NutrientValues>(() => {
    if (!resolvedServing) {
      return MENU_NUTRIENT_FIELD_KEYS.reduce<NutrientValues>((acc, key) => {
        acc[key] = toNullableNumber(menu[key]);
        return acc;
      }, {});
    }

    return MENU_NUTRIENT_FIELD_KEYS.reduce<NutrientValues>((acc, key) => {
      acc[key] = scaleNutrientValue(menu[key], resolvedServing.scaleFactor);
      return acc;
    }, {});
  }, [menu, resolvedServing]);

  const mainNutrientStates = useMemo(
    () => resolveMainNutrientStates(nutrientValues),
    [nutrientValues],
  );

  const previewMenu = useMemo<MealMenuItem>(() => {
    const resolvedCarbs = mainNutrientStates.carbs.value ?? 0;
    const resolvedProtein = mainNutrientStates.protein.value ?? 0;
    const resolvedFat = mainNutrientStates.fat.value ?? 0;

    if (!resolvedServing) {
      return {
        ...menu,
        ...nutrientValues,
        carbs: resolvedCarbs,
        protein: resolvedProtein,
        fat: resolvedFat,
      };
    }

    const scaledWeight = scaleNutrientValue(menu.weight, resolvedServing.scaleFactor);
    return {
      ...menu,
      ...nutrientValues,
      calories: scaleRequiredValue(menu.calories, resolvedServing.scaleFactor),
      carbs: resolvedCarbs,
      protein: resolvedProtein,
      fat: resolvedFat,
      weight: scaledWeight ?? resolvedServing.totalWeight,
      serving_input_mode: inputMode,
      serving_input_value:
        inputMode === "weight" ? resolvedServing.totalWeight : resolvedServing.unitCount,
    };
  }, [inputMode, mainNutrientStates, menu, nutrientValues, resolvedServing]);

  useEffect(() => {
    if (!onSelectionChange) {
      return;
    }

    if (!resolvedServing) {
      onSelectionChange(null);
      return;
    }

    onSelectionChange({
      menu: previewMenu,
      quantity: resolvedServing.totalWeight,
      mode: inputMode,
    });
  }, [inputMode, onSelectionChange, previewMenu, resolvedServing]);

  const getCurrentFallbackValue = (mode: MealServingInputMode) => {
    return clampQuantityValue(getModeFallbackValue(servingContext, mode, fallbackConsumedWeight));
  };

  const handleModeChange = (nextMode: MealServingInputMode) => {
    if (nextMode === inputMode) {
      return;
    }

    const fallbackValue = getCurrentFallbackValue(nextMode);
    if (quantity === null) {
      setInputMode(nextMode);
      setQuantityInput(fallbackValue);
      return;
    }

    const currentResolved = resolveServingValues(servingContext, inputMode, quantity);
    if (!Number.isFinite(currentResolved.scaleFactor) || currentResolved.scaleFactor <= 0) {
      setInputMode(nextMode);
      setQuantityInput(fallbackValue);
      return;
    }

    const convertedValue =
      nextMode === "weight" ? currentResolved.totalWeight : currentResolved.unitCount;
    setInputMode(nextMode);
    setQuantityInput(clampQuantityValue(convertedValue));
  };

  const handleInputBlur = () => {
    const fallbackValue = getCurrentFallbackValue(inputMode);
    if (quantityInput === undefined || !Number.isFinite(quantityInput) || quantityInput <= 0) {
      setQuantityInput(fallbackValue);
      return;
    }

    setQuantityInput(clampQuantityValue(quantityInput));
  };

  const handleInputStep = (direction: -1 | 1) => {
    const baseValue = quantity ?? getCurrentFallbackValue(inputMode);
    setQuantityInput(getSteppedQuantity(baseValue, direction));
  };
  const summaryMacroItems = SUMMARY_MACROS.reduce<SummaryMacroItem[]>((items, macro) => {
    const nutrientState = mainNutrientStates[macro.key];
    if (nutrientState.value === null) {
      return items;
    }

    items.push({
      ...macro,
      value: nutrientState.value,
      showWarning: nutrientState.isEstimated,
    });

    return items;
  }, []);
  const isEditAndAddEnabled = typeof onEditAndAdd === "function";
  const handleEditAndAddClick = () => {
    onEditAndAdd?.();
  };

  return (
    <div className={styles.root}>
      <section className={styles.menuInfoSection}>
        <div className={styles.menuNames}>
          {previewMenu.brand && (
            <p className={`body-xs-regular text-tertiary`}>{previewMenu.brand}</p>
          )}
          <p className={`title-m-semi text-primary`}>{previewMenu.name}</p>
        </div>

        <div className={styles.menuNutritionGroup}>
          <div className={styles.caloriesCard}>
            <p className="body-s-regular text-secondary">총 칼로리</p>
            <p className={`textNoWrap title-xl-medium text-primary`}>
              {formatNutrientValue(previewMenu.calories)}
              <span className={`title-s-regular text-tertiary ${styles.calorieUnit}`}>kcal</span>
            </p>
          </div>

          {summaryMacroItems.length > 0 ? (
            <div className={styles.macroCard}>
              {summaryMacroItems.map((macro) => (
                <article key={macro.key} className={styles.macroItem}>
                  <div className={styles.macroLabelRow}>
                    <p className={`body-s-regular text-secondary`}>{macro.label}</p>
                    {macro.showWarning && (
                      <InfoPopover
                        ariaLabel="영양성분 주의 안내"
                        messages={NUTRIENT_DETAIL_INFO_MESSAGES}
                        iconSize={18}
                      />
                    )}
                  </div>
                  <p className={`${styles.macroValue}`}>
                    <span className="title-m-medium text-primary">
                      {formatNutrientValue(macro.value)}
                    </span>
                    <span className="body-s-regular text-tertiary">g</span>
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          {showEditSection && (
            <button
              type="button"
              onClick={handleEditAndAddClick}
              disabled={!isEditAndAddEnabled}
              className={styles.editSection}
            >
              <span className={`body-s-regular text-tertiary`}>영양성분이 잘못되었다면?</span>
              <span className="body-s-medium text-secondary marginLeft">수정하기</span>
            </button>
          )}
        </div>
      </section>

      <section className={styles.servingInputSection}>
        <p className="title-s-semi text-primary">먹은 양</p>
        <Tabs.Root
          className={styles.tabRoot}
          value={inputMode}
          onValueChange={(nextValue) => {
            handleModeChange(nextValue === "weight" ? "weight" : "unit");
          }}
        >
          <Tabs.List className={styles.tabsList}>
            <Tabs.Tab value="unit" className={`${styles.tab}`}>
              <span className="body-l-medium">{formatBaseServingUnit(menu.unit_quantity)}</span>
              <span className="body-l-regular">
                ({menu.weight}
                {menu.unit === MENU_UNIT.GRAM ? "g" : "ml"})
              </span>
            </Tabs.Tab>
            <Tabs.Tab value="weight" className={`${styles.tab} body-l-medium`}>
              {menu.unit === MENU_UNIT.GRAM ? "g" : "ml"}
            </Tabs.Tab>

            <Tabs.Indicator className={styles.tabsIndicator} />
          </Tabs.List>

          <Tabs.Panel value="unit" className={styles.TabsPanel}>
            <div className={styles.FieldGroup}>
              <button
                type="button"
                className={styles.StepButton}
                aria-label="입력값 감소"
                onClick={() => handleInputStep(-1)}
              >
                <SystemIcon name="minus" size={18} />
              </button>
              <NumberField
                value={quantityInput}
                onChange={setQuantityInput}
                min={MIN_QUANTITY}
                max={MAX_QUANTITY}
                step={QUANTITY_STEP}
                showControls={false}
                allowOutOfRange
                normalizeValue={(value) => roundDecimal(value, 1)}
                isInputTextAllowed={isQuantityInputAllowed}
                unstyled
                classNames={{
                  group: styles.FieldInputGroup,
                  inputWrapper: styles.FieldInputWrapper,
                  input: `title-m-medium ${styles.FieldInput}`,
                  unit: `title-s-regular text-primary`,
                }}
                format={{
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                  useGrouping: false,
                }}
                inputProps={{
                  inputMode: "decimal",
                  "aria-label": "단위량 또는 중량 입력",
                  onBlur: handleInputBlur,
                }}
                unit={getServingUnitLabel(menu.unit_quantity)}
              />
              <button
                type="button"
                className={styles.StepButton}
                aria-label="입력값 증가"
                onClick={() => handleInputStep(1)}
              >
                <SystemIcon name="plus" size={18} />
              </button>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="weight" className={styles.TabsPanel}>
            <div className={styles.FieldGroup}>
              <button
                type="button"
                className={styles.StepButton}
                aria-label="입력값 감소"
                onClick={() => handleInputStep(-1)}
              >
                <SystemIcon name="minus" size={18} />
              </button>
              <NumberField
                value={quantityInput}
                onChange={setQuantityInput}
                min={MIN_QUANTITY}
                max={MAX_QUANTITY}
                step={QUANTITY_STEP}
                showControls={false}
                allowOutOfRange
                normalizeValue={(value) => roundDecimal(value, 1)}
                isInputTextAllowed={isQuantityInputAllowed}
                unstyled
                classNames={{
                  group: styles.FieldInputGroup,
                  inputWrapper: styles.FieldInputWrapper,
                  input: `title-m-medium ${styles.FieldInput} ${styles.FieldInputWeightWidth}`,
                  unit: `title-s-regular text-primary`,
                }}
                format={{
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                  useGrouping: false,
                }}
                inputProps={{
                  inputMode: "decimal",
                  "aria-label": "단위량 또는 중량 입력",
                  onBlur: handleInputBlur,
                }}
                unit={menu.unit === MENU_UNIT.GRAM ? "g" : "ml"}
              />
              <button
                type="button"
                className={styles.StepButton}
                aria-label="입력값 증가"
                onClick={() => handleInputStep(1)}
              >
                <SystemIcon name="plus" size={18} />
              </button>
            </div>
          </Tabs.Panel>
        </Tabs.Root>
      </section>

      <section className={styles.detailSection}>
        <button
          type="button"
          className={styles.detailToggleButton}
          onClick={onToggleDetail}
          aria-expanded={isDetailOpen}
          aria-controls={detailListId}
        >
          <p className="title-s-semi text-primary">상세 영양성분 보기</p>
          <SystemIcon
            name="chevron-down"
            size={20}
            data-isClicked={isDetailOpen}
            className={`${styles.arrowIcon} text-secondary`}
          />
        </button>

        {isDetailOpen && (
          <section className={styles.detailNutritionSection}>
            <NutrientDetailList
              detailListId={detailListId}
              className={styles.detailList}
              weight={previewMenu.weight}
              weightUnit={servingWeightUnit}
              calories={previewMenu.calories}
              nutrientValues={nutrientValues}
            />
          </section>
        )}
      </section>
    </div>
  );
}
