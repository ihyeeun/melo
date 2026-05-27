import { Select } from "@base-ui/react";
import { useMemo } from "react";

import styles from "@/features/chat/styles/ChatMealRecordBottomSheet.module.css";
import {
  type ChatRecommendItemResponseDto,
  MEAL_TYPE_OPTIONS,
  type MealServingInputMode,
  type MealType,
  MENU_UNIT,
} from "@/shared/api/types/api.dto";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";

type SelectedMenuItem = {
  id: number;
  quantity: number;
  mode?: MealServingInputMode;
};

type ServingWeightUnit = "g" | "ml";

type ServingContext = {
  baseWeight: number;
  baseUnitCount: number;
  unitLabel: string;
  weightUnit: ServingWeightUnit;
};

export type ChatMealRecordMenu = Pick<
  ChatRecommendItemResponseDto,
  "menu_id" | "menu_name" | "brand" | "unit" | "weight" | "unit_quantity" | "calories"
>;

const MEAL_TYPE_ICON_MAP = {
  "0": "/icons/breakfast.svg",
  "1": "/icons/lunch.svg",
  "2": "/icons/dinner.svg",
  "3": "/icons/snack.svg",
  "4": "/icons/pizza-icon.svg",
} satisfies Record<MealType, string>;

type ChatMealRecordBottomSheetProps = {
  isOpen: boolean;
  recommendations: ChatMealRecordMenu[];
  selectedMenus: SelectedMenuItem[];
  mealType: MealType;
  isSubmitPending?: boolean;
  submitLabel?: string;
  onMealTypeChange: (mealType: MealType) => void;
  onQuantityChange: (menuId: number, nextQuantity: number) => void;
  onModeChange: (menuId: number, nextMode: MealServingInputMode) => void;
  onRemoveMenu: (menuId: number) => void;
  onAddMore?: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

const QUANTITY_STEP = 0.5;
const MIN_QUANTITY = 0.1;
const CONSUMED_WEIGHT_PRECISION = 4;
const UNIT_QUANTITY_PATTERN = /^\s*([\d.]+)\s*(.*)$/;

function roundDecimal(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toPositiveNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function resolveServingContext(recommendation: ChatMealRecordMenu): ServingContext {
  const matched = recommendation.unit_quantity.match(UNIT_QUANTITY_PATTERN);
  const parsedCount = matched ? Number(matched[1]) : Number.NaN;
  const unitLabel = matched?.[2]?.trim() || recommendation.unit_quantity || "인분";

  return {
    baseWeight: toPositiveNumber(recommendation.weight) ?? 1,
    baseUnitCount: toPositiveNumber(parsedCount) ?? 1,
    unitLabel,
    weightUnit: recommendation.unit === MENU_UNIT.MILLILITER ? "ml" : "g",
  };
}

function getDisplayValue(
  consumedWeight: number,
  mode: MealServingInputMode,
  servingContext: ServingContext,
) {
  if (mode === "unit") {
    return roundDecimal(
      (consumedWeight / servingContext.baseWeight) * servingContext.baseUnitCount,
      1,
    );
  }

  return roundDecimal(consumedWeight, 1);
}

function toConsumedWeight(
  displayValue: number,
  mode: MealServingInputMode,
  servingContext: ServingContext,
) {
  if (mode === "weight") {
    return roundDecimal(displayValue, CONSUMED_WEIGHT_PRECISION);
  }

  return roundDecimal(
    (displayValue / servingContext.baseUnitCount) * servingContext.baseWeight,
    CONSUMED_WEIGHT_PRECISION,
  );
}

function getScaledCalories(
  baseCalories: number,
  consumedWeight: number,
  servingContext: ServingContext,
) {
  return baseCalories * (consumedWeight / servingContext.baseWeight);
}

export function ChatMealRecordBottomSheet({
  isOpen,
  recommendations,
  selectedMenus,
  mealType,
  isSubmitPending = false,
  submitLabel = "담기",
  onMealTypeChange,
  onQuantityChange,
  onModeChange,
  onRemoveMenu,
  onAddMore,
  onClose,
  onSubmit,
}: ChatMealRecordBottomSheetProps) {
  const recommendationById = useMemo(
    () => new Map(recommendations.map((item) => [item.menu_id, item])),
    [recommendations],
  );

  const selectedItems = useMemo(() => {
    return selectedMenus
      .map((menu) => {
        const recommendation = recommendationById.get(menu.id);
        if (!recommendation) {
          return null;
        }

        return {
          ...menu,
          recommendation,
          servingContext: resolveServingContext(recommendation),
          mode: menu.mode ?? "unit",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [recommendationById, selectedMenus]);

  const totalCalories = selectedItems.reduce((sum, item) => {
    return (
      sum + getScaledCalories(item.recommendation.calories, item.quantity, item.servingContext)
    );
  }, 0);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <section className={styles.container}>
        <div className={styles.scrollArea}>
          <article className={styles.calorieCard}>
            <span className="typo-title2">총 칼로리</span>
            <div className={`${styles.calorieValueWrapper} textNoWrap`}>
              <span className={`${styles.calorieValue} typo-h2`}>
                {formatNumberWithMaxOneDecimal(totalCalories)}
              </span>
              <span className="typo-caption1">kcal</span>
            </div>
          </article>

          <section>
            <p className={`${styles.sectionTitle} typo-title4`}>섭취시간대</p>
            <div className={styles.mealTypeList}>
              {MEAL_TYPE_OPTIONS.map((option) => {
                const isActive = option.key === mealType;
                const iconSrc = MEAL_TYPE_ICON_MAP[option.key];

                return (
                  <div className={styles.mealTypeButtonWrapper} key={option.key}>
                    <button
                      type="button"
                      className={`${styles.mealTypeButton} ${isActive ? styles.mealTypeButtonActive : ""}`}
                      onClick={() => onMealTypeChange(option.key)}
                      aria-pressed={isActive}
                      aria-label={option.label}
                    >
                      <img src={iconSrc} width={32} height={32} aria-hidden="true" />
                    </button>
                    <span
                      className={`${isActive ? styles.primaryText : styles.secondaryText} typo-label4`}
                    >
                      {option.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.menuSection}>
            {selectedItems.map((item) => {
              const displayValue = getDisplayValue(item.quantity, item.mode, item.servingContext);
              const selectLabel =
                item.mode === "unit"
                  ? item.servingContext.unitLabel
                  : item.servingContext.weightUnit;

              return (
                <article key={item.id} className={styles.menuItem}>
                  <div className={styles.menuNameRow}>
                    <p className="typo-title4">{item.recommendation.menu_name}</p>
                    {item.recommendation.brand && (
                      <p className={`${styles.tertiaryText} typo-label4`}>
                        {item.recommendation.brand}
                      </p>
                    )}
                  </div>

                  <div className={styles.quantityControlRow}>
                    <div className={styles.quantityStepper}>
                      <NumberField
                        value={displayValue}
                        onChange={(nextValue) => {
                          if (nextValue === undefined) {
                            return;
                          }

                          if (nextValue < MIN_QUANTITY) {
                            onRemoveMenu(item.id);
                            return;
                          }

                          const nextConsumedWeight = toConsumedWeight(
                            nextValue,
                            item.mode,
                            item.servingContext,
                          );
                          onQuantityChange(item.id, nextConsumedWeight);
                        }}
                        min={0}
                        step={QUANTITY_STEP}
                        snapOnStep
                        decrementAriaLabel={`${item.recommendation.menu_name} 수량 감소`}
                        incrementAriaLabel={`${item.recommendation.menu_name} 수량 증가`}
                        decrementIcon={
                          <SystemIcon name="circle-minus" mode="image" size={24} />
                        }
                        incrementIcon={<SystemIcon name="circle-plus" mode="image" size={24} />}
                        normalizeValue={(value) => roundDecimal(value, 1)}
                        unstyled
                        classNames={{
                          group: styles.quantityNumberFieldGroup,
                          decrement: styles.quantityNumberFieldButton,
                          increment: styles.quantityNumberFieldButton,
                          inputWrapper: styles.quantityNumberFieldInputWrapper,
                          input: `typo-body1 ${styles.quantityNumberFieldInput}`,
                        }}
                        format={{
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 1,
                          useGrouping: false,
                        }}
                        inputProps={{
                          inputMode: "decimal",
                          "aria-label": `${item.recommendation.menu_name} 수량 입력`,
                        }}
                      />
                    </div>

                    <Select.Root
                      value={item.mode}
                      onValueChange={(nextValue) => {
                        const safeMode = nextValue === "weight" ? "weight" : "unit";
                        onModeChange(item.id, safeMode);
                      }}
                    >
                      <Select.Trigger className={`${styles.unitSelectTrigger} typo-h2`}>
                        <Select.Value className="typo-body3">{selectLabel}</Select.Value>
                      <Select.Icon className={styles.selectIcon} aria-hidden>
                          <SystemIcon name="chevron-down-normal" size={24} />
                      </Select.Icon>
                      </Select.Trigger>

                      <Select.Portal>
                        <Select.Positioner className={styles.selectPositioner}>
                          <Select.Popup className={styles.selectPopup}>
                            <Select.List className={styles.selectList}>
                              <Select.Item
                                value="unit"
                                className={`${styles.selectItem} typo-body3`}
                              >
                                <Select.ItemText>{item.servingContext.unitLabel}</Select.ItemText>
                              </Select.Item>
                              <Select.Item
                                value="weight"
                                className={`${styles.selectItem} typo-body3`}
                              >
                                <Select.ItemText>{item.servingContext.weightUnit}</Select.ItemText>
                              </Select.Item>
                            </Select.List>
                          </Select.Popup>
                        </Select.Positioner>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </article>
              );
            })}
          </section>

          {onAddMore ? (
            <section className={styles.additionalAction}>
              <p className={`${styles.secondaryText} typo-body3`}>다른 메뉴도 드셨나요?</p>
              <Button
                variant="text"
                interaction="normal"
                size="small"
                color="normal"
                onClick={onAddMore}
              >
                추가하러 가기
              </Button>
            </section>
          ) : null}

          <div className={styles.actionBar}>
            <Button
              variant="filled"
              interaction={selectedItems.length > 0 && !isSubmitPending ? "normal" : "disable"}
              size="large"
              color="primary"
              fullWidth
              disabled={selectedItems.length === 0 || isSubmitPending}
              onClick={onSubmit}
            >
              {isSubmitPending ? "저장 중..." : submitLabel}
            </Button>
          </div>
        </div>
      </section>
    </BottomSheet>
  );
}
