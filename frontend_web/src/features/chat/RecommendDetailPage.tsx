import { useEffect, useMemo } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/RecommendDetailPage.module.css";
import { getSafeChatId, getSafeMenuId } from "@/features/chat/utils/recommendNavigation";
import { PATH } from "@/router/path";
import { DataSourceBadge } from "@/shared/commons/badge/DataSourceBadge";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { useNavigate, useSearchParams } from "@/shared/navigation/stackflowNavigation";

export default function RecommendDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatId = getSafeChatId(searchParams.get("chatId"));
  const menuId = getSafeMenuId(searchParams.get("menuId"));
  const { data, isPending } = useGetChatHistoryQuery();

  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return data?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatId, data?.chat_list]);

  const recommendation = useMemo(() => {
    if (!chatItem || menuId === null) return null;
    return (
      chatItem.response_payload.recommendations.find((item) => item.menu_id === menuId) ?? null
    );
  }, [chatItem, menuId]);

  useEffect(() => {
    if (chatId === null || menuId === null) {
      navigate(PATH.CHAT, { replace: true });
      return;
    }

    if (isPending) {
      return;
    }

    if (!chatItem || !recommendation) {
      navigate(PATH.CHAT, { replace: true });
    }
  }, [chatId, chatItem, isPending, menuId, navigate, recommendation]);

  if (chatId === null || menuId === null) {
    return null;
  }

  if (isPending && !recommendation) {
    return (
      <section className={styles.page}>
        <PageHeader title="추천 상세" onBack={() => navigate(-1)} />
        <main className={styles.main}>
          <p className={`${styles.loadingText} typo-body4`}>추천 상세를 불러오는 중이에요</p>
        </main>
      </section>
    );
  }

  if (!chatItem || !recommendation) {
    return null;
  }

  return (
    <section className={styles.page}>
      <PageHeader title="추천 상세" onBack={() => navigate(-1)} />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.menuInfo}>
            <div>
              <p className={`${styles.summaryText} typo-label4`}>
                {recommendation.one_line_summary}
              </p>

              <p className={`${styles.menuName} typo-title1`}>{recommendation.menu_name}</p>
              <div className={styles.titleRow}>
                <div className={styles.titleGroup}>
                  {recommendation.brand && (
                    <span className={`${styles.tertiaryText} typo-label4`}>
                      {recommendation.brand}
                    </span>
                  )}
                  <p className={`${styles.secondaryText} typo-label4`}>
                    1{recommendation.unit_quantity} ({recommendation.weight}
                    {recommendation.unit === 0 ? "g" : "ml"})
                  </p>
                </div>
                <p className={`${styles.caloriesText} typo-title1`}>
                  {formatCalories(recommendation.calories)} kcal
                </p>
              </div>
            </div>

            <div className={styles.tagRow}>
              {recommendation.data_source === 1 && <DataSourceBadge variant="personal" />}
            </div>
          </section>

          <div className="divider" />

          <section className={styles.detailSection}>
            <p className={`${styles.scoreText} typo-title3`}>
              메뉴 점수는{" "}
              <span className={styles.primaryText}>{Math.round(recommendation.score)}점</span>
              이에요.
            </p>
            <p className={`${styles.reasonText} typo-body3`}>
              {recommendation.recommendation_reason}
            </p>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <Button variant="outlined" size="large" color="primary" fullWidth onClick={() => {}}>
          영양소 상세
        </Button>
        <Button
          variant="filled"
          size="large"
          color="primary"
          fullWidth
          onClick={() => navigate(-1)}
        >
          확인했어요
        </Button>
      </footer>
    </section>
  );
}

function formatCalories(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  });
}
