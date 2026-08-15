import { useMemo } from "react";

import { NUTRIENT_DETAIL_INFO_MESSAGES } from "@/features/meal-record/constants/nutrientInfoMessages";
import {
  buildDetailGroups,
  buildDetailRows,
  formatNutrientValue,
  type NutrientValues,
  resolveMainNutrientStates,
} from "@/features/meal-record/utils/nutrientDetail";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";

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
        <p className="body-l-medium">
          총 용량 {formatNutrientValue(weight)}
          {weightUnit}
        </p>

        <div className={styles.detailValue}>
          <span className={`${styles.textNormal} textNoWrap body-l-medium`}>
            {formatNutrientValue(calories)}
            <span className="body-s-regular text-tertiary"> kcal</span>
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
                      className={`${row.variant === "sub" ? "body-s-medium text-tertiary" : "body-l-medium text-secondary"} ${
                        row.variant === "sub" ? styles.detailLabelSub : ""
                      }`}
                    >
                      {row.label}
                    </p>

                    <div className={styles.detailValue}>
                      {row.showWarning && row.key !== "totalWeight" && (
                        <InfoPopover
                          ariaLabel="영양성분 주의 안내"
                          messages={NUTRIENT_DETAIL_INFO_MESSAGES}
                        />
                      )}

                      <span
                        className={`${row.variant === "sub" ? "body-xs-regular" : "body-s-regular"} text-primary`}
                      >
                        {formatNutrientValue(row.value)}{" "}
                        <span className="text-tertiary">{row.unit}</span>
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
