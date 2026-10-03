import type { MouseEvent } from "react";

import { MENU_DATA_SOURCE, type MenuDataSource } from "@/shared/api/types/api.dto";
import { DataSourceBadge } from "@/shared/commons/badge/DataSourceBadge";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";
import { getServingUnitLabel } from "@/shared/utils/servingUnit";

import styles from "./MealMenuCard.module.css";

export type MealMenuCardIcon = "add" | "minus" | "delete";

type MealMenuCardProps = {
  name: string;
  calories?: number;
  unit_quantity?: string;
  brand?: string;
  unit?: number;
  weight?: number;
  quantity?: number;
  data_source?: MenuDataSource | number;
  icon?: MealMenuCardIcon;
  state?: boolean;
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
  if (icon === "add") return "메뉴 추가";
  return "선택 메뉴 취소";
}

function ActionIcon({ icon, isSelected }: { icon: MealMenuCardIcon; isSelected?: boolean }) {
  if (icon === "delete") return <SystemIcon name="exit" size={18} />;

  return (
    <span className={styles.actionIcon} data-icon={isSelected ? "minus" : "add"} aria-hidden="true">
      <SystemIcon name="minus" size={18} />
      <SystemIcon name="minus" size={18} className={styles.actionIconVertical} />
    </span>
  );
}

export function MealMenuCard({
  name,
  calories,
  unit_quantity,
  brand,
  unit,
  weight,
  quantity,
  data_source,
  icon,
  state = false,
  className,
  onClick,
  onIconClick,
}: MealMenuCardProps) {
  const handleIconClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onIconClick?.();
  };

  const isSelected = state;
  const isPersonalMenu = data_source === MENU_DATA_SOURCE.PERSONAL;
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

  return (
    <SelectedCard isSelected={isSelected} className={`${styles.root} ${className}`}>
      <button onClick={onClick ? () => onClick() : undefined} className={styles.contents}>
        {isPersonalMenu && <DataSourceBadge variant="personal" active={isSelected} />}

        <p className={`body-l-medium text-primary ellipsis`}>{name}</p>

        {shouldShowCalories ? (
          <p className={`${styles.meta} body-s-regular`}>
            {brand && <span className={`ellipsis text-tertiary`}>{brand}</span>}
            <span className={`textNoWrap text-secondary`}>
              {formatQuantity(safeDisplayUnitCount)}
              {servingUnitLabel} {`(${formatQuantity(resolvedConsumedWeight)}${weightUnitText})`}
            </span>

            <span className={`textNoWrap text-secondary`}>
              {formatDisplayNumber(displayedCalories)} kcal
            </span>
          </p>
        ) : null}
      </button>

      {icon && (
        <div className={styles.quickAction}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleIconClick}
            disabled={!onIconClick}
            aria-label={getActionAriaLabel(icon)}
            data-selected={isSelected}
          >
            <ActionIcon icon={icon} isSelected={isSelected} />
          </button>
        </div>
      )}
    </SelectedCard>
  );
}
