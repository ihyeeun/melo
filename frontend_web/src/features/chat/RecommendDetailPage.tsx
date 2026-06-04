import { useEffect, useMemo, useState } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/RecommendDetailPage.module.css";
import { getSafeChatId, getSafeMenuId } from "@/features/chat/utils/recommendNavigation";
import { NutrientDetailList } from "@/features/meal-record/components/NutrientDetailList";
import { useMealDetailQuery } from "@/features/meal-record/hooks/queries/useMealDetailQuery";
import type { NutrientValues } from "@/features/meal-record/utils/nutrientDetail";
import { PATH } from "@/router/path";
import { MENU_NUTRIENT_FIELD_KEYS, MENU_UNIT } from "@/shared/api/types/api.dto";
import { DataSourceBadge } from "@/shared/commons/badge/DataSourceBadge";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton, SkeletonStatus, SkeletonText } from "@/shared/commons/skeleton/Skeleton";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";

export default function RecommendDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isNutrientSheetOpen, setIsNutrientSheetOpen] = useState(false);
  const chatId = getSafeChatId(searchParams.get("chatId"));
  const menuId = getSafeMenuId(searchParams.get("menuId"));
  const { data, isPending } = useGetChatHistoryQuery();
  const { data: menuDetail } = useMealDetailQuery(menuId);

  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return data?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatId, data?.chat_list]);
  const recommendationPayload =
    chatItem?.response_payload?.chat_category === "recommendation"
      ? chatItem.response_payload
      : null;

  const recommendation = useMemo(() => {
    if (!recommendationPayload || menuId === null) return null;
    return recommendationPayload.recommendations.find((item) => item.menu_id === menuId) ?? null;
  }, [recommendationPayload, menuId]);

  const nutrientSource = menuDetail ?? recommendation;

  const recommendationNutrientValues = useMemo<NutrientValues>(() => {
    if (!nutrientSource) {
      return {};
    }

    return MENU_NUTRIENT_FIELD_KEYS.reduce<NutrientValues>((acc, key) => {
      acc[key] = nutrientSource[key] ?? null;
      return acc;
    }, {});
  }, [nutrientSource]);

  useEffect(() => {
    if (chatId === null || menuId === null) {
      navigateBack({ fallbackTo: PATH.CHAT });
      return;
    }

    if (isPending) {
      return;
    }

    if (!chatItem || !recommendation) {
      navigateBack({ fallbackTo: PATH.CHAT });
    }
  }, [chatId, chatItem, isPending, menuId, navigate, recommendation]);

  if (chatId === null || menuId === null) {
    return null;
  }

  if (isPending && !recommendation) {
    return (
      <section className={styles.page}>
        <PageHeader
          title="추천 상세"
          onBack={() => {
            navigateBack({ fallbackTo: PATH.CHAT });
          }}
        />
        <main className={styles.main}>
          <RecommendDetailSkeleton />
        </main>
      </section>
    );
  }

  if (!chatItem || !recommendation) {
    return null;
  }

  const visibleNutrientSource = nutrientSource ?? recommendation;
  const servingUnitLabel =
    recommendation.unit_quantity.trim() === "인분" ? recommendation.unit_quantity : "기준량";

  return (
    <section className={styles.page}>
      <PageHeader title="추천 상세" onBack={() => navigateBack({ fallbackTo: PATH.CHAT })} />

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
                    1{servingUnitLabel} ({recommendation.weight}
                    {recommendation.unit === 0 ? "g" : "ml"})
                  </p>
                </div>
                <p className={`${styles.caloriesText} textNoWrap typo-title1`}>
                  {formatNumberWithMaxOneDecimal(recommendation.calories)}kcal
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
        <Button
          variant="outlined"
          size="large"
          color="primary"
          fullWidth
          onClick={() => setIsNutrientSheetOpen(true)}
        >
          영양소 상세
        </Button>
        <Button
          variant="filled"
          size="large"
          color="primary"
          fullWidth
          onClick={() => navigateBack({ fallbackTo: PATH.CHAT })}
        >
          확인했어요
        </Button>
      </footer>

      <BottomSheet
        isOpen={isNutrientSheetOpen}
        onClose={() => setIsNutrientSheetOpen(false)}
        className={styles.nutrientBottomSheet}
        disableContentDrag
      >
        <section className={styles.nutrientSheetContent}>
          <h2 className={`${styles.nutrientSheetTitle} typo-title2`}>영양 정보</h2>
          <NutrientDetailList
            detailListId="recommend-nutrient-detail-list"
            weight={visibleNutrientSource.weight}
            weightUnit={visibleNutrientSource.unit === MENU_UNIT.MILLILITER ? "ml" : "g"}
            calories={visibleNutrientSource.calories}
            nutrientValues={recommendationNutrientValues}
          />
        </section>
      </BottomSheet>
    </section>
  );
}

function RecommendDetailSkeleton() {
  return (
    <SkeletonStatus className={styles.content} label="추천 상세를 불러오는 중입니다.">
      <section className={styles.menuInfo}>
        <Skeleton width="42%" height={16} radius={999} />
        <Skeleton width="64%" height={32} radius={999} />
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <Skeleton width={80} height={16} radius={999} />
            <Skeleton width={110} height={16} radius={999} />
          </div>
          <Skeleton className={`${styles.caloriesText} textNoWrap`} width={96} height={28} radius={999} />
        </div>
        <Skeleton width={64} height={24} radius={4} />
      </section>

      <div className="divider" />

      <section className={styles.detailSection}>
        <Skeleton width="58%" height={22} radius={999} />
        <SkeletonText lines={4} lineHeight={16} widths={["100%", "94%", "88%", "54%"]} />
      </section>
    </SkeletonStatus>
  );
}
