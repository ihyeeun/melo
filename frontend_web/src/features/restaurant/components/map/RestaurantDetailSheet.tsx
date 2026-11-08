import { Tabs } from "@base-ui/react";

import MapSheetHeader from "@/features/restaurant/components/map/MapSheetHeader";
import RestaurantMenuList from "@/features/restaurant/components/RestaurantMenuList";
import {
  BEST_OPTIONS,
  type BestFilter,
} from "@/features/restaurant/constants/restaurantBest.constant";
import { useRestaurantDetailQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import styles from "@/features/restaurant/styles/MapSheetView.module.css";
import restaurantStyles from "@/features/restaurant/styles/RestaurantPage.module.css";

const BEST_MENU_COUNT = 5;

type RestaurantDetailSheetProps = {
  restaurant: SheetRestaurant;
  onBack: () => void;
};

// 선택한 탭의 패널만 그려지므로, 탭을 눌렀을 때 그 기준으로 처음 요청한다.
function BestMenuList({ restaurantId, filter }: { restaurantId: number; filter: BestFilter }) {
  const { data, isPending, isError, refetch } = useRestaurantDetailQuery({
    restaurant_id: restaurantId,
    filter,
  });

  return (
    <RestaurantMenuList
      // 서버가 추천 순서로 정렬해 준다고 보고 앞에서부터 자른다.
      menus={data?.menu_list.slice(0, BEST_MENU_COUNT) ?? []}
      isPending={isPending}
      isError={isError}
      onRetry={() => void refetch()}
    />
  );
}

export default function RestaurantDetailSheet({ restaurant, onBack }: RestaurantDetailSheetProps) {
  const { data, isPending, isError, refetch } = useRestaurantDetailQuery({
    restaurant_id: restaurant.restaurantId,
  });

  return (
    <section>
      <MapSheetHeader title={restaurant.restaurantName} onBack={onBack} />

      <h3 className={`body-l-semi text-primary ${styles.sectionTitle}`}>
        오늘 식단 기록 기준 BEST {BEST_MENU_COUNT}
      </h3>
      <Tabs.Root defaultValue={BEST_OPTIONS[0].filter}>
        <Tabs.List className={styles.bestTabList} aria-label="BEST 메뉴 기준">
          {BEST_OPTIONS.map(({ filter }) => (
            <Tabs.Tab
              key={filter}
              value={filter}
              className={`${restaurantStyles.tab} body-s-medium`}
            >
              {filter} BEST
            </Tabs.Tab>
          ))}
          <Tabs.Indicator className={restaurantStyles.tabIndicator} />
        </Tabs.List>
        {BEST_OPTIONS.map(({ filter }) => (
          <Tabs.Panel key={filter} value={filter} className={styles.bestPanel}>
            <BestMenuList restaurantId={restaurant.restaurantId} filter={filter} />
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      <h3 className={`body-l-semi text-primary ${styles.sectionTitle}`}>전체 메뉴</h3>
      <RestaurantMenuList
        menus={data?.menu_list ?? []}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </section>
  );
}
