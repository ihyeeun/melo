import { Popover } from "@base-ui/react/popover";
import { useMemo } from "react";

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

const DETAIL_WARNING_MESSAGE = [
  "실제로는 더 많이 들어있을 수 있어요.",
  "판매사에서 정확한 정보를 제공하고 있지 않아요.",
] as const;

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
          <span className={`${styles.textNormal} typo-body1`}>
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
                      className={`${row.variant === "sub" ? "typo-body4" : "typo-title4"} ${
                        row.variant === "sub" ? styles.detailLabelSub : styles.textNormal
                      }`}
                    >
                      {row.label}
                    </p>

                    <div className={styles.detailValue}>
                      {row.showWarning && row.key !== "totalWeight" && (
                        <Popover.Root>
                          <Popover.Trigger
                            type="button"
                            className={styles.warningButton}
                            aria-label="영양성분 주의 안내"
                          >
                            <img src="/icons/info-icon.svg" alt="" aria-hidden="true" />
                          </Popover.Trigger>

                          <Popover.Portal>
                            <Popover.Positioner
                              className={styles.warningPositioner}
                              side="left"
                              align="center"
                              sideOffset={12}
                              collisionPadding={50}
                            >
                              <Popover.Popup
                                className={`${styles.warningTooltip} typo-label3`}
                                initialFocus={false}
                                finalFocus={false}
                              >
                                {DETAIL_WARNING_MESSAGE[0]}
                                <br />
                                {DETAIL_WARNING_MESSAGE[1]}
                              </Popover.Popup>
                            </Popover.Positioner>
                          </Popover.Portal>
                        </Popover.Root>
                      )}

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
