import { useEffect, useMemo, useState } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/RecommendResultPage.module.css";
import { getRecommendDetailPath, getSafeChatId } from "@/features/chat/utils/recommendNavigation";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

type RecommendFilter = "all" | "brand" | "food";

const RECOMMEND_FILTER_OPTIONS: { key: RecommendFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "brand", label: "브랜드" },
  { key: "food", label: "음식" },
];

export default function RecommendResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatId = getSafeChatId(searchParams.get("chatId"));
  const [selectedFilter, setSelectedFilter] = useState<RecommendFilter>("all");

  const { data, isPending } = useGetChatHistoryQuery();
  const { data: profile } = useGetProfileQuery();

  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return data?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatId, data?.chat_list]);
  const recommendationPayload =
    chatItem?.response_payload?.chat_category === "recommendation"
      ? chatItem.response_payload
      : null;
  const filteredRecommendations = useMemo(() => {
    const recommendations = recommendationPayload?.recommendations ?? [];

    if (selectedFilter === "brand") {
      return recommendations.filter((item) => hasBrand(item.brand));
    }

    if (selectedFilter === "food") {
      return recommendations.filter((item) => !hasBrand(item.brand));
    }

    return recommendations;
  }, [recommendationPayload?.recommendations, selectedFilter]);

  useEffect(() => {
    if (chatId === null) {
      navigate(PATH.CHAT, { replace: true });
      return;
    }

    if (isPending) {
      return;
    }

    if (!recommendationPayload || recommendationPayload.recommendations.length === 0) {
      navigate(PATH.CHAT, { replace: true });
    }
  }, [chatId, isPending, navigate, recommendationPayload]);

  if (chatId === null) {
    return null;
  }

  if (isPending && !chatItem) {
    return (
      <section className={styles.page}>
        <PageHeader title="메뉴 추천 결과" onBack={() => navigateBack({ fallbackTo: PATH.CHAT })} />
        <main className={styles.main}>
          <RecommendResultSkeleton />
        </main>
      </section>
    );
  }

  if (!chatItem || !recommendationPayload || recommendationPayload.recommendations.length === 0) {
    return null;
  }

  return (
    <section className={styles.page}>
      <PageHeader title="메뉴 추천 결과" onBack={() => navigateBack({ fallbackTo: PATH.CHAT })} />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.intro}>
            <p className={`${styles.introMessage} typo-title2`}>
              <span className={styles.primaryText}>{profile?.nickname ?? ""}</span>님을 위한 메뉴를
              추천해드려요!
            </p>

            <img src="/icons/character-love.svg" className={styles.characterImage} />
          </section>

          <section>
            <div className={styles.filterList} aria-label="추천 결과 필터">
              {RECOMMEND_FILTER_OPTIONS.map((option) => {
                const isSelected = selectedFilter === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`${styles.filterBadge} ${isSelected ? styles.filterBadgeSelected : ""} typo-label4`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedFilter(option.key)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {filteredRecommendations.length > 0 ? (
              <ul className={styles.resultList}>
                {filteredRecommendations.map((item) => (
                  <li key={item.menu_id}>
                    <button
                      type="button"
                      className={styles.resultCard}
                      onClick={() => navigate(getRecommendDetailPath(chatItem.id, item.menu_id))}
                    >
                      <span className={`${styles.rankBadge} typo-label6`}>{item.rank}위</span>

                      <div className={styles.cardBody}>
                        <div className={styles.textGroup}>
                          <p className={`${styles.menuName} typo-title2`}>{item.menu_name}</p>
                          <p className={`${styles.summary} typo-label4`}>{item.one_line_summary}</p>

                          <div className={styles.metaRow}>
                            {hasBrand(item.brand) && (
                              <span className={`${styles.tertiaryText} typo-label4`}>
                                {item.brand}
                              </span>
                            )}
                            <span className={`${styles.secondaryText} typo-label4`}>
                              1{item.unit_quantity} ({item.weight}
                              {item.unit === 0 ? "g" : "ml"})
                            </span>
                            <span className={`${styles.calories} typo-title2`}>
                              {formatCalories(item.calories)} kcal
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`${styles.emptyStatus} typo-label4`}>해당하는 추천 메뉴가 없어요.</p>
            )}
          </section>
        </div>
      </main>
    </section>
  );
}

function RecommendResultSkeleton() {
  return (
    <SkeletonStatus className={styles.content} label="추천 결과를 불러오는 중입니다.">
      <div className={styles.intro}>
        <div className={styles.skeletonIntroText}>
          <Skeleton width="78%" height={24} radius={999} />
          <Skeleton width="46%" height={24} radius={999} />
        </div>
        <Skeleton width={80} height={80} variant="circle" />
      </div>

      <ul className={styles.resultList}>
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index}>
            <article className={styles.resultCard}>
              <Skeleton width={42} height={22} radius={4} />
              <div className={styles.cardBody}>
                <div className={styles.textGroup}>
                  <Skeleton width="54%" height={24} radius={999} />
                  <Skeleton width="86%" height={16} radius={999} />
                  <div className={styles.metaRow}>
                    <Skeleton width="30%" height={16} radius={999} />
                    <Skeleton width="26%" height={16} radius={999} />
                    <Skeleton className={styles.calories} width="26%" height={22} radius={999} />
                  </div>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </SkeletonStatus>
  );
}

function formatCalories(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  });
}

function hasBrand(brand?: string) {
  return Boolean(brand?.trim());
}
