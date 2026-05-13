import { useState } from "react";

import styles from "@/features/chat/styles/FeedbackDetailPage.module.css";
import { getSafeMenuId } from "@/features/chat/utils/recommendNavigation";
import {
  MealMenuNutrientDetail,
  type MealMenuNutrientSelection,
} from "@/features/meal-record/components/MealMenuNutrientDetail";
import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { useNavigate, useSearchParams } from "@/shared/navigation/stackflowNavigation";

export default function FeedbackDetailPage() {
  const navigate = useNavigate();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selection, setSelection] = useState<MealMenuNutrientSelection | null>(null);
  const [searchParams] = useSearchParams();
  const menuId = getSafeMenuId(searchParams.get("menuId"));

  const { data: meal, isPending } = useMealDetailQuery(menuId);

  if (isPending) {
    return <p>로딩 중..</p>;
  }
  if (!meal || menuId === null) return null;

  return (
    <section className={styles.page}>
      <PageHeader title="영양성분 상세" onBack={() => navigate(-1)} />

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
          interaction={selection ? "normal" : "disable"}
          disabled={!selection}
        >
          {/* {isAlreadyQueued ? "수정하기" : "담기"} */}
        </Button>
      </footer>
    </section>
  );
}
