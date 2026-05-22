import { useMemo } from "react";

import { NutrientWarningPopover } from "@/features/meal-record/components/NutrientWarningPopover";
import {
  buildDetailGroups,
  buildDetailRows,
  formatNutrientValue,
  type NutrientValues,
  resolveMainNutrientStates,
} from "@/features/meal-record/utils/nutrientDetail";

import styles from "../styles/NutrientDetailList.module.css";

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
    <div id={detailListId} className={`${styles.detailList} ${className ?? ""}`}>
      <div className={styles.detailRow}>
        <p className="typo-title4">
          총 용량 {formatNutrientValue(weight)}
          {weightUnit}
        </p>

        <div className={styles.detailValue}>
          <span className={`${styles.textNormal} textNoWrap typo-body1`}>
            {formatNutrientValue(calories)} kcal
          </span>
        </div>
      </div>

      {detailGroups.map((group, groupIndex) => (
        <section key={group.group} className={styles.detailGroup}>
          <div className={styles.detailGroupRows}>
            {group.rows.map((row) => {
              return (
                <div key={row.key}>
                  {groupIndex > 0 && row.variant === "main" && (
                    <div className={styles.groupDivider} />
                  )}

                  <article className={styles.detailRow}>
                    <p
                      className={`${row.variant === "sub" ? "typo-body3" : "typo-title4"} ${
                        row.variant === "sub" ? styles.detailLabelSub : styles.textNormal
                      }`}
                    >
                      {row.label}
                    </p>

                    <div className={styles.detailValue}>
                      {row.showWarning && row.key !== "totalWeight" && <NutrientWarningPopover />}

                      <span className={row.variant === "sub" ? "typo-body3" : "typo-body1"}>
                        {formatNutrientValue(row.value)} {row.unit}
                      </span>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
