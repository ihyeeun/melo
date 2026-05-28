import { Skeleton, SkeletonStatus, SkeletonText } from "@/shared/commons/skeleton/Skeleton";

import styles from "../styles/MealMenuNutrientDetail.module.css";

type MealMenuNutrientDetailSkeletonProps = {
  showEditSection?: boolean;
};

export function MealMenuNutrientDetailSkeleton({
  showEditSection = true,
}: MealMenuNutrientDetailSkeletonProps) {
  return (
    <SkeletonStatus className={styles.skeletonRoot} label="영양성분 상세를 불러오는 중입니다.">
      <section className={styles.summarySection}>
        <div className={styles.summaryContent}>
          <Skeleton width="58%" height={24} radius={999} />
          <div className={styles.summarySecond}>
            <Skeleton width="36%" height={18} radius={999} />
            <Skeleton className={`${styles.calories} textNoWrap`} width="28%" height={28} radius={999} />
          </div>
        </div>

        <div className={styles.macroContainer}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.skeletonMacroItem}>
              <Skeleton width="44%" height={14} radius={999} />
              <Skeleton width="64%" height={18} radius={999} />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.servingInputSection}>
        <div className={styles.TabsList}>
          <Skeleton height={44} radius={6} />
          <Skeleton height={44} radius={6} />
        </div>
        <div className={styles.FieldGroup}>
          <Skeleton width={24} height={24} variant="circle" />
          <Skeleton width="34%" height={24} radius={999} />
          <Skeleton width={24} height={24} variant="circle" />
        </div>
      </section>

      <section className={styles.detailSection}>
        <div className={styles.skeletonDetailHeader}>
          <Skeleton width="34%" height={20} radius={999} />
          <Skeleton width={24} height={24} variant="circle" />
        </div>
        <SkeletonText className={styles.skeletonDetailRows} lines={5} lineHeight={16} />
      </section>

      {showEditSection ? (
        <section className={styles.editSection}>
          <Skeleton width="46%" height={18} radius={999} />
          <Skeleton width="24%" height={18} radius={999} />
        </section>
      ) : null}
    </SkeletonStatus>
  );
}
