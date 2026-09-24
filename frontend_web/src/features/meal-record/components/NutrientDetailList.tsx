import { useMemo } from "react";

import { NUTRIENT_DETAIL_INFO_MESSAGES } from "@/features/meal-record/constants/nutrientInfoMessages";
import styles from "@/features/meal-record/styles/NutrientDetailList.module.css";
import {
  buildDetailGroups,
  buildDetailRows,
  formatNutrientValue,
  type NutrientValues,
  resolveMainNutrientStates,
} from "@/features/meal-record/utils/nutrientDetail";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";

type NutrientDetailListProps = {
  detailListId?: string;
  className?: string;
  weight: number | null | undefined;
  weightUnit: "g" | "ml";
  calories: number | null | undefined;
  nutrientValues: NutrientValues;
};

export function NutrientDetailList({
  detailListId,
  className,
  weight,
  weightUnit,
  calories,
  nutrientValues,
}: NutrientDetailListProps) {
  const mainNutrientStates = useMemo(
    () => resolveMainNutrientStates(nutrientValues),
    [nutrientValues],
  );
  const detailRows = useMemo(
    () =>
      buildDetailRows({
        nutrientValues,
        mainNutrientStates,
      }),
    [mainNutrientStates, nutrientValues],
  );
  const detailGroups = useMemo(() => buildDetailGroups(detailRows), [detailRows]);

  return (
    <div id={detailListId} className={`${styles.nutritionList} ${className ?? ""}`}>
      <div className={styles.listItem}>
        <p className="body-l-medium text-secondary">
          총 용량 {formatNutrientValue(weight)}
          {weightUnit}
        </p>

        <div className={styles.amount}>
          <span className={`body-l-medium text-primary`}>{formatNutrientValue(calories)}</span>
          <span className="body-s-regular text-tertiary">kcal</span>
        </div>
      </div>

      {detailGroups.map((group) => (
        <section key={group.group} className={styles.macroGroup}>
          {group.rows.map((row) => {
            return (
              <div key={row.key} className={styles.listItem}>
                <p
                  className={`${row.variant === "sub" ? `body-s-medium text-tertiary ${styles.subLabel}` : "body-l-medium text-secondary"}`}
                >
                  {row.label}
                </p>

                <div className={styles.amount}>
                  {row.showWarning && row.key !== "totalWeight" && (
                    <InfoPopover
                      ariaLabel="영양성분 주의 안내"
                      messages={NUTRIENT_DETAIL_INFO_MESSAGES}
                      iconSize={20}
                      align="end"
                      side="bottom"
                    />
                  )}

                  <span
                    className={`${row.variant === "sub" ? "body-s-medium" : "body-l-medium"} text-primary`}
                  >
                    {formatNutrientValue(row.value)}
                  </span>
                  <span
                    className={`${row.variant === "sub" ? "body-xs-regular" : "body-s-regular"} text-tertiary`}
                  >
                    {row.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
