import styles from "@/features/meal-record/styles/MealMenuNutrientDetail.module.css";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";

export function MealMenuNutrientDetailSkeleton() {
  return (
    <SkeletonStatus className={styles.root} label="영양성분 상세를 불러오는 중입니다.">
      <section className={styles.menuInfoSection}>
        <div className={styles.menuNames}>
          <Skeleton width="15%" height={20} />
          <Skeleton width="50%" height={26} />
        </div>

        <div className={styles.menuNutritionGroup}>
          <div className={styles.caloriesCard}>
            <Skeleton width="44%" height={65} radius={16} />
          </div>

          <div className={styles.macroCard}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className={styles.macroItem}>
                <Skeleton width="100%" height={65} radius={16} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.servingInputSection}>
        <Skeleton width="20%" height={25} radius={16} />

        <div className={styles.tabRoot}>
          <Skeleton width="0" height={132} />
        </div>
      </section>
    </SkeletonStatus>
  );
}
