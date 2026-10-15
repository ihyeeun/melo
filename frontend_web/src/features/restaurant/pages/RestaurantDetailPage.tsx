import { Tabs } from "@base-ui/react";
import { useState } from "react";

import RestaurantMenuList from "@/features/restaurant/components/RestaurantMenuList";
import { useRestaurantDetailQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import styles from "@/features/restaurant/styles/RestaurantPage.module.css";
import { PATH } from "@/router/path";
import type { RestaurantDetailRequestDto } from "@/shared/api/types/api.request.dto";
import type { RestaurantSummaryResponseDto } from "@/shared/api/types/api.response.dto";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import {
  navigateBack,
  useLocation,
  useSearchParams,
  useStackflowBackHandler,
} from "@/shared/navigation/stackflowNavigation";

type BestFilter = NonNullable<RestaurantDetailRequestDto["filter"]>;

const BEST_OPTIONS = [
  { filter: "균형", icon: "⚖️", tone: "balanced" },
  { filter: "저칼로리", icon: "🥬", tone: "light" },
  { filter: "단백질", icon: "💪", tone: "protein" },
] as const;

export default function RestaurantDetailPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation<RestaurantSummaryResponseDto>();
  const restaurantId = Number(searchParams.get("restaurantId"));
  const [filter, setFilter] = useState<BestFilter | null>(null);
  const { data, isPending, isError, refetch } = useRestaurantDetailQuery({
    restaurant_id: restaurantId,
    filter: filter ?? undefined,
  });
  const restaurantName = data?.restaurant_name ?? location.state?.restaurant_name ?? "식당 상세";

  useStackflowBackHandler(
    filter
      ? () => {
          setFilter(null);
          return true;
        }
      : null,
  );

  const menuList = (
    <RestaurantMenuList
      menus={data?.menu_list ?? []}
      isPending={isPending}
      isError={isError}
      onRetry={() => void refetch()}
    />
  );

  return (
    <section className={`page ${styles.page}`}>
      <PageHeader
        title={restaurantName}
        onBack={() => navigateBack({ fallbackTo: PATH.RESTAURANT })}
      />
      {!Number.isSafeInteger(restaurantId) || restaurantId <= 0 ? (
        <p className={`${styles.state} body-l-medium`} role="alert">
          식당 정보를 확인할 수 없어요
        </p>
      ) : (
        <>
          <Tabs.Root defaultValue="best" className={styles.tabs}>
            <Tabs.List className={styles.tabList} aria-label="식당 메뉴">
              <Tabs.Tab value="best" className={`${styles.tab} body-s-medium`}>
                Best 메뉴
              </Tabs.Tab>
              <Tabs.Tab value="all" className={`${styles.tab} body-s-medium`}>
                전체 메뉴
              </Tabs.Tab>
              <Tabs.Indicator className={styles.tabIndicator} />
            </Tabs.List>
            <Tabs.Panel value="best" className={`main ${styles.panel}`}>
              <div className={styles.banner}>
                <div className={styles.bannerText}>
                  <p className="caption-m-medium text-highlight">오늘도 맛있게!</p>
                  <h2 className="title-s-semi">지금, 나에게 딱 맞는 메뉴</h2>
                  <p className="caption-m-regular text-tertiary">
                    오늘의 식단 기록을 바탕으로 추천했어요
                  </p>
                </div>
                <img
                  src="/icons/characters/menu-recommendation.png"
                  alt=""
                  width={100}
                  height={100}
                />
              </div>
              <div className={styles.bestCards}>
                {BEST_OPTIONS.map((option) => (
                  <button
                    key={option.filter}
                    type="button"
                    className={styles.bestCard}
                    data-tone={option.tone}
                    aria-haspopup="dialog"
                    onClick={() => setFilter(option.filter)}
                  >
                    <span className={styles.bestIcon} aria-hidden="true">
                      {option.icon}
                    </span>
                    <span className="body-l-medium text-primary">{option.filter} Best</span>
                    <SystemIcon
                      name="chevron-right"
                      size={20}
                      className="marginLeft text-tertiary"
                    />
                  </button>
                ))}
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="all" className={`main ${styles.panel}`}>
              {menuList}
            </Tabs.Panel>
          </Tabs.Root>
          <BottomSheet
            isOpen={filter !== null}
            onClose={() => setFilter(null)}
            title={filter ? `${filter} Best` : undefined}
            bodyClassName={styles.sheetBody}
          >
            {filter && menuList}
          </BottomSheet>
        </>
      )}
    </section>
  );
}
