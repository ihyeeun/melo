import { Select } from "@base-ui/react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";

import styles from "@/features/chat/styles/ChatMealRecordBottomSheet.module.css";
import type { ChatMenuDetailNavigationState } from "@/features/chat/utils/recommendNavigation";
import {
  formatMenuDraftKey,
  useMenuDraftClear,
  useMenuDraftInit,
  useMenuDraftMenus,
  useMenuDraftRemove,
  useMenuDraftUpsert,
} from "@/features/meal-record/stores/menuDraft.store";
import { PATH } from "@/router/path";
import {
  MEAL_TYPE_OPTIONS,
  type MealServingInputMode,
  type MealType,
  MENU_UNIT,
} from "@/shared/api/types/api.dto";
import type { ChatRecommendItemResponseDto } from "@/shared/api/types/api.response.dto";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { ScrollFogArea } from "@/shared/commons/scrollFog";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { formatDateKeyToMonthDayWeekdayLabel } from "@/shared/utils/dateFormat";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";
import { getServingUnitLabel } from "@/shared/utils/servingUnit";

type SelectedMenuItem = {
  id: number;
  quantity: number;
  mode: MealServingInputMode;
};

type ServingWeightUnit = "g" | "ml";

type ServingContext = {
  baseWeight: number;
  unitLabel: string | null | undefined;
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
  isActive?: boolean;
  recommendations: ChatMealRecordMenu[];
  initialSelectedMenus: SelectedMenuItem[];
  mealType: MealType;
  dateKey?: string;
  detailFallbackTo?: string;
  positionerStyle?: CSSProperties;
  modal?: boolean;
  isSubmitPending?: boolean;
  submitLabel?: string;
  onMealTypeChange: (mealType: MealType, selectedMenus: SelectedMenuItem[]) => SelectedMenuItem[];
  onAddMore?: (selectedMenus: SelectedMenuItem[]) => void;
  onClose: () => void;
  onSubmit: (selectedMenus: SelectedMenuItem[]) => void | Promise<boolean | void>;
};

const QUANTITY_STEP = 0.5;
const MIN_QUANTITY = 0.1;
const CONSUMED_WEIGHT_PRECISION = 4;

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
  return {
    baseWeight: toPositiveNumber(recommendation.weight) ?? 1,
    unitLabel: recommendation.unit_quantity,
    weightUnit: recommendation.unit === MENU_UNIT.MILLILITER ? "ml" : "g",
  };
}

function getDisplayValue(
  consumedWeight: number,
  mode: MealServingInputMode,
  servingContext: ServingContext,
) {
  if (mode === "unit") {
    return roundDecimal(consumedWeight / servingContext.baseWeight, 1);
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

  return roundDecimal(displayValue * servingContext.baseWeight, CONSUMED_WEIGHT_PRECISION);
}

function getScaledCalories(
  baseCalories: number,
  consumedWeight: number,
  servingContext: ServingContext,
) {
  return baseCalories * (consumedWeight / servingContext.baseWeight);
}

function normalizeSelectedMenus(
  menus: Array<{ id: number; quantity: number; mode?: MealServingInputMode }>,
): SelectedMenuItem[] {
  return menus.map((menu) => ({
    id: menu.id,
    quantity: menu.quantity,
    mode: menu.mode === "weight" ? "weight" : "unit",
  }));
}

export function ChatMealRecordBottomSheet({
  isOpen,
  isActive = true,
  recommendations,
  initialSelectedMenus,
  mealType,
  dateKey,
  detailFallbackTo = PATH.CHAT,
  positionerStyle,
  modal = true,
  isSubmitPending = false,
  submitLabel = "담기",
  onMealTypeChange,
  onAddMore,
  onClose,
  onSubmit,
}: ChatMealRecordBottomSheetProps) {
  const navigate = useNavigate();
  const hasInitializedDraftRef = useRef(false);
  const draftKey = formatMenuDraftKey(dateKey ?? "", mealType);
  const draftMenus = useMenuDraftMenus(dateKey ?? "", mealType);
  const selectedMenus = useMemo(() => normalizeSelectedMenus(draftMenus), [draftMenus]);
  const initDraft = useMenuDraftInit();
  const upsertMenu = useMenuDraftUpsert();
  const removeMenu = useMenuDraftRemove();
  const clearDraft = useMenuDraftClear();
  const recommendationById = useMemo(
    () => new Map(recommendations.map((item) => [item.menu_id, item])),
    [recommendations],
  );

  useEffect(() => {
    if (!isOpen || !dateKey || hasInitializedDraftRef.current) {
      return;
    }

    hasInitializedDraftRef.current = true;
    initDraft({
      key: draftKey,
      existingMenuCount: initialSelectedMenus.length,
      seedMenus: initialSelectedMenus,
    });
  }, [dateKey, draftKey, initDraft, initialSelectedMenus, isOpen]);

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
  const dateLabel = dateKey ? formatDateKeyToMonthDayWeekdayLabel(dateKey) : null;
  const actionLabel = selectedItems.length === 0 ? "수정하기" : submitLabel;

  const clearMealRecordDrafts = () => {
    if (!dateKey) {
      return;
    }

    MEAL_TYPE_OPTIONS.forEach((option) => {
      clearDraft(formatMenuDraftKey(dateKey, option.key));
    });
  };

  const handleClose = () => {
    if (!isActive) {
      return;
    }

    clearMealRecordDrafts();
    onClose();
  };

  const handleNavigateMenuDetail = (menuId: number) => {
    const selectedMenu = selectedMenus.find((menu) => menu.id === menuId);
    const searchParams = new URLSearchParams({
      menuId: String(menuId),
    });

    if (dateKey) {
      searchParams.set("source", "chatMealRecordBottomSheet");
      searchParams.set("date", dateKey);
      searchParams.set("mealType", mealType);
    }

    const navigationState: ChatMenuDetailNavigationState = {
      fallbackTo: detailFallbackTo,
      initialSelection: selectedMenu
        ? {
            menuId,
            quantity: selectedMenu.quantity,
            mode: selectedMenu.mode ?? "unit",
          }
        : null,
    };

    navigate(`${PATH.CHAT_NUTRITION_DETAIL}?${searchParams.toString()}`, {
      state: navigationState,
    });
  };

  const handleMealTypeChange = (nextMealType: MealType) => {
    if (!dateKey) {
      onMealTypeChange(nextMealType, selectedMenus);
      return;
    }

    const nextMenus = onMealTypeChange(nextMealType, selectedMenus);
    const nextDraftKey = formatMenuDraftKey(dateKey, nextMealType);

    clearDraft(nextDraftKey);
    initDraft({
      key: nextDraftKey,
      existingMenuCount: nextMenus.length,
      seedMenus: nextMenus,
    });
  };

  const handleSubmit = async () => {
    const submitResult = await onSubmit(selectedMenus);

    if (submitResult !== false) {
      clearMealRecordDrafts();
    }
  };

  const handleAddMore = () => {
    clearMealRecordDrafts();
    onAddMore?.(selectedMenus);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      bodyClassName={styles.sheetBody}
      positionerStyle={positionerStyle}
      modal={modal}
    >
      <div className={styles.container}>
        <ScrollFogArea className={styles.scrollArea}>
          {dateLabel ? <p className={`typo-title2 textNormal`}>{dateLabel}</p> : null}

          <section>
            <p className={`${styles.marginBottom8px} typo-title4 textNormal`}>섭취시간대</p>
            <div className={styles.mealTypeList}>
              {MEAL_TYPE_OPTIONS.map((option) => {
                const isActive = option.key === mealType;
                const iconSrc = MEAL_TYPE_ICON_MAP[option.key];

                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`${styles.mealTypeButton} ${isActive ? styles.mealTypeButtonActive : ""}`}
                    onClick={() => handleMealTypeChange(option.key)}
                    aria-pressed={isActive}
                    aria-label={option.label}
                  >
                    <img src={iconSrc} width={32} height={32} aria-hidden="true" />
                    <span
                      className={`${isActive ? styles.primaryText : styles.secondaryText} typo-label4`}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.menuSection}>
            <article className={styles.calorieTitle}>
              <span className="typo-title4 textNormal">총 칼로리</span>
              <div className={`${styles.calorieValueWrapper} textNoWrap`}>
                <span className={`textNormal typo-title1`}>
                  {formatNumberWithMaxOneDecimal(totalCalories)}
                </span>
                <span className="typo-caption1">kcal</span>
              </div>
            </article>

            <div className={styles.menuList}>
              {selectedItems.map((item) => {
                const displayValue = getDisplayValue(item.quantity, item.mode, item.servingContext);
                const itemCalories = getScaledCalories(
                  item.recommendation.calories,
                  item.quantity,
                  item.servingContext,
                );
                const unitSelectLabel = getServingUnitLabel(item.servingContext.unitLabel);
                const selectLabel =
                  item.mode === "unit" ? unitSelectLabel : item.servingContext.weightUnit;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.menuCard}
                    onClick={() => handleNavigateMenuDetail(item.id)}
                    aria-label={`${item.recommendation.menu_name} 영양성분 상세 보기`}
                  >
                    <div className={styles.menuItemTop}>
                      <div className={styles.menuName}>
                        <p className="typo-title4">{item.recommendation.menu_name}</p>
                        <button
                          type="button"
                          className={styles.menuRemoveButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeMenu({ key: draftKey, id: item.id });
                          }}
                          aria-label={`${item.recommendation.menu_name} 삭제`}
                        >
                          <SystemIcon name="trash" size={20} />
                        </button>
                      </div>
                      <p className={`typo-label4 textAssistive`}>
                        {item.recommendation.brand && <span>{item.recommendation.brand} ㅣ </span>}
                        {formatNumberWithMaxOneDecimal(itemCalories)}kcal
                      </p>
                    </div>

                    <div
                      className={styles.quantityControlRow}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className={styles.quantityStepper}>
                        <NumberField
                          value={displayValue}
                          onChange={(nextValue) => {
                            if (nextValue === undefined) {
                              return;
                            }

                            if (nextValue < MIN_QUANTITY) {
                              removeMenu({ key: draftKey, id: item.id });
                              return;
                            }

                            const nextConsumedWeight = toConsumedWeight(
                              nextValue,
                              item.mode,
                              item.servingContext,
                            );
                            upsertMenu({
                              key: draftKey,
                              id: item.id,
                              quantity: nextConsumedWeight,
                            });
                          }}
                          min={0}
                          step={QUANTITY_STEP}
                          snapOnStep
                          decrementAriaLabel={`${item.recommendation.menu_name} 수량 감소`}
                          incrementAriaLabel={`${item.recommendation.menu_name} 수량 증가`}
                          decrementIcon={<SystemIcon name="minus" mode="image" size={24} />}
                          incrementIcon={<SystemIcon name="plus" mode="image" size={24} />}
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
                          upsertMenu({
                            key: draftKey,
                            id: item.id,
                            quantity: item.quantity,
                            mode: safeMode,
                          });
                        }}
                      >
                        <Select.Trigger className={`${styles.unitSelectTrigger} typo-h2`}>
                          <Select.Value className="typo-body2">{selectLabel}</Select.Value>
                          <Select.Icon className={styles.selectIcon} aria-hidden>
                            <SystemIcon name="chevron-down-thin" size={24} />
                          </Select.Icon>
                        </Select.Trigger>

                        <Select.Portal>
                          <Select.Positioner
                            className={styles.selectPositioner}
                            side="bottom"
                            align="end"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Select.Popup
                              className={styles.selectPopup}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Select.List className={styles.selectList}>
                                <Select.Item
                                  value="unit"
                                  className={`${styles.selectItem} typo-body2`}
                                >
                                  <Select.ItemText>{unitSelectLabel}</Select.ItemText>
                                </Select.Item>
                                <Select.Item
                                  value="weight"
                                  className={`${styles.selectItem} typo-body2`}
                                >
                                  <Select.ItemText>
                                    {item.servingContext.weightUnit}
                                  </Select.ItemText>
                                </Select.Item>
                              </Select.List>
                            </Select.Popup>
                          </Select.Positioner>
                        </Select.Portal>
                      </Select.Root>
                    </div>
                  </button>
                );
              })}

              <section className={styles.additionalAction}>
                <p className={`${styles.secondaryText} typo-body3`}>다른 메뉴도 드셨나요?</p>
                <Button
                  variant="text"
                  interaction="normal"
                  size="small"
                  color="normal"
                  onClick={handleAddMore}
                >
                  추가하러 가기
                </Button>
              </section>
            </div>
          </section>
        </ScrollFogArea>

        <section className={styles.actionBar}>
          <Button
            variant="filled"
            interaction={isSubmitPending ? "disable" : "normal"}
            size="large"
            color="primary"
            fullWidth
            disabled={isSubmitPending}
            onClick={handleSubmit}
          >
            {isSubmitPending ? "저장 중..." : actionLabel}
          </Button>
        </section>
      </div>
    </BottomSheet>
  );
}
