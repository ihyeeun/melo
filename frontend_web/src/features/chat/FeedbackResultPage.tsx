import { useMemo } from "react";

import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/RecommendResultPage.module.css";
import { getSafeChatId } from "@/features/chat/utils/recommendNavigation";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { useNavigate, useSearchParams } from "@/shared/navigation/stackflowNavigation";

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

  if (chatId === null || !feedbackMenu) {
    return null;
  }
  if (isPending && !chatItem) {
    return (
      <section className={styles.page}>
        <PageHeader title="메뉴 추천 결과" onBack={() => navigate(-1)} />
        <main className={styles.main}>
          <p className={`${styles.loadingText} typo-body4`}>추천 결과를 불러오는 중이에요</p>
        </main>
      </section>
    );
  }

  const handleMenuClick = (menuId: number) => {};

  return (
    <section className={styles.page}>
      <PageHeader title="메뉴 추천 결과" onBack={() => navigate(-1)} />

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
                  // brand={menu.brand}
                  data_source={menu.data_source}
                  weight={menu.weight}
                  unit={menu.unit}
                  icon={isSelected ? "check" : "add"}
                  state={isSelected ? "select" : "default"}
                  onClick={() => handleMenuClick(menu.menu_id)}
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
