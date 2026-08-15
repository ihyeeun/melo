import type { MouseEvent } from "react";

import { MENU_DATA_SOURCE, type MenuDataSource } from "@/shared/api/types/api.dto";
import { DataSourceBadge } from "@/shared/commons/badge/DataSourceBadge";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
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
  if (icon === "add") return <SystemIcon name="plus-circle" mode="image" size={24} />;
  if (icon === "check") return <SystemIcon name="circle-check" mode="image" size={24} />;
  return <SystemIcon name="exit" size={24} />;
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
  const handleIconClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onIconClick?.();
  };

  const isSelected = state === "select";
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
  const shouldShowServingInfo = !hideServingInfo;
  const shouldShowMeta = shouldShowServingInfo || shouldShowCalories;
  const metaClassName = [
    styles.meta,
    !shouldShowServingInfo && shouldShowCalories ? styles.metaOnlyCalories : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SelectedCard
      isSelected={isSelected}
      setSelectedChange={onClick ? () => onClick() : undefined}
      className={className}
    >
      <div className={styles.content}>
        {typeof rank === "number" && Number.isFinite(rank) ? (
          <span className={`${styles.rankBadge} caption-m-medium`}>{rank}위</span>
        ) : null}

        <section className={styles.header}>
          <p className={`${styles.title} body-l-medium text-primary ellipsis`}>{name}</p>

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
        </section>

        {shouldShowMeta ? (
          <section className={metaClassName}>
            {shouldShowServingInfo ? (
              <p className={`${styles.menuInfoGroup}`}>
                {brand && (
                  <span className={`ellipsis body-s-regular text-tertiary`} title={brand}>
                    {brand}
                  </span>
                )}
                <span className={`textNoWrap body-s-regular text-secondary`}>
                  {formatQuantity(safeDisplayUnitCount)}
                  {servingUnitLabel}{" "}
                  {`(${formatQuantity(resolvedConsumedWeight)}${weightUnitText})`}
                </span>
              </p>
            ) : null}

            {description && (
              <p className={`body-s-regular text-primary ${styles.description} ellipsis`}>
                {description}
              </p>
            )}

            {shouldShowCalories ? (
              <span className={`textNoWrap title-s-regular text-primary marginLeft`}>
                {formatNumberWithMaxOneDecimal(displayedCalories)}kcal
              </span>
            ) : null}
          </section>
        ) : null}
      </div>

      {isPersonalMenu && <DataSourceBadge variant="personal" active={isSelected} />}
    </SelectedCard>
  );
}
