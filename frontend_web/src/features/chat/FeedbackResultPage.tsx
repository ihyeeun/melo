import { useMemo } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/RecommendResultPage.module.css";
import { getFeedbackDetailPath, getSafeChatId } from "@/features/chat/utils/recommendNavigation";
import { PATH } from "@/router/path";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

export default function FeedbackResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatId = getSafeChatId(searchParams.get("chatId"));

  const { data: chatHistory, isPending } = useGetChatHistoryQuery();
  const chatItem = useMemo(() => {
    if (chatId === null) return null;
    return chatHistory?.chat_list.find((item) => item.id === chatId) ?? null;
  }, [chatId, chatHistory?.chat_list]);
  const feedbackMenu =
    chatItem?.response_payload.chat_category === "feedback"
      ? chatItem.response_payload.feedback
      : null;

  if (chatId === null) {
    return null;
  }

  if (isPending && !chatItem) {
    return (
      <section className={styles.page}>
        <PageHeader
          title="메뉴 추천 결과"
          onBack={() => {
            navigateBack({ fallbackTo: PATH.CHAT });
          }}
        />
        <main className={styles.main}>
          <FeedbackResultSkeleton />
        </main>
      </section>
    );
  }

  if (!feedbackMenu) {
    return null;
  }

  const handleMenuClick = ({ menuId, chatId }: { menuId: number; chatId: number }) => {
    navigate(getFeedbackDetailPath(chatId, menuId));
  };

  return (
    <section className={styles.page}>
      <PageHeader
        title="메뉴 추천 결과"
        onBack={() => {
          navigateBack({ fallbackTo: PATH.CHAT });
        }}
      />

      <main className={styles.main}>
        <section className={styles.content}>
          <ul className={styles.resultList}>
            {feedbackMenu.menus.map((menu, index) => {
              const isSelected = false;

              return (
                <MealMenuCard
                  key={index}
                  name={menu.menu_name}
                  calories={menu.calories}
                  unit_quantity={menu.unit_quantity}
                  brand={menu.brand}
                  data_source={menu.data_source}
                  weight={menu.weight}
                  unit={menu.unit}
                  icon={isSelected ? "check" : "add"}
                  state={isSelected ? "select" : "default"}
                  onClick={() => handleMenuClick({ menuId: menu.menu_id, chatId })}
                  onIconClick={() => {}}
                />
              );
            })}
          </ul>
        </section>
      </main>
    </section>
  );
}

function FeedbackResultSkeleton() {
  return (
    <SkeletonStatus className={styles.content} label="추천 결과를 불러오는 중입니다.">
      <ul className={styles.resultList}>
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index}>
            <article className={styles.resultCard}>
              <div className={styles.cardBody}>
                <div className={styles.textGroup}>
                  <Skeleton width="58%" height={24} radius={999} />
                  <Skeleton width="34%" height={16} radius={999} />
                  <div className={styles.metaRow}>
                    <Skeleton width="38%" height={16} radius={999} />
                    <Skeleton className={styles.calories} width="28%" height={22} radius={999} />
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
