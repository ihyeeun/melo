import { useState } from "react";

import styles from "@/features/chat/styles/FeedbackDetailPage.module.css";
import { getSafeMenuId } from "@/features/chat/utils/recommendNavigation";
import {
  MealMenuNutrientDetail,
  type MealMenuNutrientSelection,
} from "@/features/meal-record/components/MealMenuNutrientDetail";
import { MealMenuNutrientDetailSkeleton } from "@/features/meal-record/components/MealMenuNutrientDetailSkeleton";
import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import { PATH } from "@/router/path";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { navigateBack, useSearchParams } from "@/shared/navigation/stackflowNavigation";

export default function FeedbackDetailPage() {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selection, setSelection] = useState<MealMenuNutrientSelection | null>(null);
  const [searchParams] = useSearchParams();
  const menuId = getSafeMenuId(searchParams.get("menuId"));

  const { data: meal, isPending } = useMealDetailQuery(menuId);

  if (isPending) {
    return (
      <section className={styles.page}>
        <PageHeader
          title="영양성분 상세"
          onBack={() => {
            navigateBack({ fallbackTo: PATH.CHAT });
          }}
        />

        <main className={styles.main}>
          <div className={styles.content}>
            <MealMenuNutrientDetailSkeleton showEditSection={false} />
          </div>
        </main>

        <footer className={styles.footer}>
          <Skeleton width="100%" height={48} radius={8} />
        </footer>
      </section>
    );
  }
  if (!meal || menuId === null) return null;

  return (
    <section className={styles.page}>
      <PageHeader
        title="영양성분 상세"
        onBack={() => {
          navigateBack({ fallbackTo: PATH.CHAT });
        }}
      />

      <main className={styles.main}>
        <div className={styles.content}>
          <MealMenuNutrientDetail
            menu={meal}
            isDetailOpen={isDetailOpen}
            onToggleDetail={() => setIsDetailOpen((prev) => !prev)}
            onSelectionChange={setSelection}
            showEditSection={false}
          />
        </div>
      </main>

      <footer className={styles.footer}>
        <Button
          variant="filled"
          size="large"
          color="primary"
          fullWidth
          onClick={() => {}}
          // interaction={selection ? "normal" : "disable"}
          interaction="disable"
          disabled={!selection}
        >
          {/* {isAlreadyQueued ? "수정하기" : "담기"} */}
          담기
        </Button>
      </footer>
    </section>
  );
}
