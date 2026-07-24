import type { KeyboardEvent, MouseEvent } from "react";

import { MENU_DATA_SOURCE, type MenuDataSource } from "@/shared/api/types/api.dto";
import { DataSourceBadge } from "@/shared/commons/badge/DataSourceBadge";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";
import { getServingUnitLabel } from "@/shared/utils/servingUnit";

import styles from "./MealMenuCard.module.css";

export type MealMenuCardIcon = "add" | "check" | "delete";
export type MealMenuCardState = "default" | "select";

type MealMenuCardProps = {
  name: string;
  rank?: number;
  description?: string;
  calories?: number;
  unit_quantity?: string;
  brand?: string;
  unit?: number;
  weight?: number;
  quantity?: number;
  data_source?: MenuDataSource | number;
  icon?: MealMenuCardIcon | null;
  state?: MealMenuCardState;
  hideServingInfo?: boolean;
  className?: string;
  onClick?: () => void;
  onIconClick?: () => void;
};

const UNIT_QUANTITY_PATTERN = /^\s*([\d.]+)/;

function formatQuantity(value: number) {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function toPositiveNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function parseBaseUnitCount(unitQuantity?: string) {
  if (typeof unitQuantity !== "string" || unitQuantity.trim().length === 0) {
    return 1;
  }

  const matched = unitQuantity.match(UNIT_QUANTITY_PATTERN);
  const parsed = matched ? Number(matched[1]) : Number.NaN;
  return toPositiveNumber(parsed) ?? 1;
}

function getActionAriaLabel(icon: MealMenuCardIcon) {
  if (icon === "add") return "추가";
  if (icon === "check") return "선택 완료";
  return "삭제";
}

function ActionIcon({ icon }: { icon: MealMenuCardIcon }) {
  if (icon === "add") return <SystemIcon name="circle-plus" mode="image" size={24} />;
  if (icon === "check") return <SystemIcon name="circle-check-selected" mode="image" size={24} />;
  return <SystemIcon name="close" size={24} />;
}

export function MealMenuCard({
  name,
  rank,
  description,
  calories,
  unit_quantity,
  brand,
  unit,
  weight,
  quantity,
  data_source,
  icon = "delete",
  state = "default",
  hideServingInfo = false,
  className,
  onClick,
  onIconClick,
}: MealMenuCardProps) {
  const classes = [
    styles.card,
    state === "select" ? styles.selected : "",
    onClick ? styles.clickable : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onClick();
  };

  const handleIconClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onIconClick?.();
  };

  const isSelected = state === "select";
  const isPersonalMenu = data_source === MENU_DATA_SOURCE.PERSONAL;
  const shouldShowChipList = isPersonalMenu;
  const safeQuantityInput =
    typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0 ? quantity : null;
  const safeWeight = toPositiveNumber(weight);
  const resolvedConsumedWeight = safeQuantityInput ?? safeWeight ?? 1;
  const safeDisplayUnitCount =
    safeWeight !== null
      ? (resolvedConsumedWeight / safeWeight) * parseBaseUnitCount(unit_quantity)
      : resolvedConsumedWeight;
  const displayedCalories =
    typeof calories === "number" && Number.isFinite(calories) ? calories : null;
  const weightUnitText = unit === 1 ? "ml" : "g";
  const servingUnitLabel = getServingUnitLabel(unit_quantity);
  const shouldShowCalories = displayedCalories !== null;
  const shouldShowServingInfo = !hideServingInfo;
  const shouldShowMeta = shouldShowServingInfo || shouldShowCalories;
  const metaClassName = [
    styles.meta,
    !shouldShowServingInfo && shouldShowCalories ? styles.metaOnlyCalories : "",
  ]
    .filter(Boolean)
    .join(" ");
  // const servingAmountLabel =
  //   servingUnitLabel === "인분"
  //     ? `${formatQuantity(safeDisplayUnitCount)}${servingUnitLabel}`
  //     : `1${servingUnitLabel}`;

  return (
    <article
      className={classes}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className={styles.content}>
        <section className={styles.header}>
          {typeof rank === "number" && Number.isFinite(rank) ? (
            <span className={`${styles.rankBadge} typo-caption4`}>{rank}위</span>
          ) : null}

          <div className={styles.titleSection}>
            <p className={`${styles.title} typo-title3 ellipsis`}>{name}</p>

            {icon !== null && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleIconClick}
                disabled={!onIconClick}
                aria-label={getActionAriaLabel(icon)}
              >
                <ActionIcon icon={icon} />
              </button>
            )}
          </div>
        </section>

        {shouldShowMeta ? (
          <section className={metaClassName}>
            {shouldShowServingInfo ? (
              <p className={styles.prouductInfo}>
                {brand && (
                  <span className={`${styles.brand} typo-label4`} title={brand}>
                    {brand}
                  </span>
                )}
                <span className={`${styles.unitAmount} typo-label4`}>
                  {formatQuantity(safeDisplayUnitCount)}
                  {servingUnitLabel}
                </span>
                <span
                  className={`${styles.unitAmount} typo-label4`}
                >{`(${formatQuantity(resolvedConsumedWeight)}${weightUnitText})`}</span>
              </p>
            ) : null}

            {description && (
              <p className={`typo-body3 ${styles.description} ellipsis`}>{description}</p>
            )}

            {shouldShowCalories ? (
              <span className={`${styles.calories} textNoWrap typo-title3`}>
                {formatNumberWithMaxOneDecimal(displayedCalories)}kcal
              </span>
            ) : null}
          </section>
        ) : null}
      </div>

      {shouldShowChipList && (
        <div className={styles.chipList}>
          {isPersonalMenu && <DataSourceBadge variant="personal" active={isSelected} />}
        </div>
      )}
    </article>
  );
}
