import { Tabs } from "@base-ui/react";

import MapSheetHeader from "@/features/restaurant/components/map/MapSheetHeader";
import SheetMenuList from "@/features/restaurant/components/map/SheetMenuList";
import {
  BEST_OPTIONS,
  type BestFilter,
} from "@/features/restaurant/constants/restaurantBest.constant";
import { useRestaurantDetailQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import styles from "@/features/restaurant/styles/MapSheetView.module.css";
import { formatDistance } from "@/features/restaurant/utils/distance.util";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

const BEST_MENU_COUNT = 5;

type RestaurantDetailSheetProps = {
  restaurant: SheetRestaurant;
  onBack: () => void;
};

// 선택한 탭의 패널만 그려지므로, 탭을 눌렀을 때 그 기준으로 처음 요청한다.
function BestMenuList({ restaurantId, filter }: { restaurantId: number; filter: BestFilter }) {
  const { data, isPending, isError } = useRestaurantDetailQuery({
    restaurant_id: restaurantId,
    filter,
  });

  return (
    <SheetMenuList
      // 서버가 추천 순서로 정렬해 준다고 보고 앞에서부터 자른다.
      menus={data?.menu_list.slice(0, BEST_MENU_COUNT) ?? []}
      isPending={isPending}
      isError={isError}
      ranked
    />
  );
}

function RestaurantMenuSections({ restaurantId }: { restaurantId: number }) {
  const { data, isPending, isError } = useRestaurantDetailQuery({
    restaurant_id: restaurantId,
  });

  return (
    <>
      <Tabs.Root defaultValue={BEST_OPTIONS[0].filter}>
        <Tabs.List className={styles.bestTabList} aria-label="BEST 메뉴 기준">
          {BEST_OPTIONS.map(({ filter }) => (
            <Tabs.Tab key={filter} value={filter} className={`body-s-medium ${styles.bestTab}`}>
              {filter} BEST
            </Tabs.Tab>
          ))}
          <Tabs.Indicator className={styles.bestTabIndicator} />
        </Tabs.List>
        {BEST_OPTIONS.map(({ filter }) => (
          <Tabs.Panel key={filter} value={filter} className={styles.bestPanel}>
            <BestMenuList restaurantId={restaurantId} filter={filter} />
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      {/* TODO: 식당 메뉴 전체 보기 페이지가 생기면 이 목록 대신 그 페이지로 가는 버튼을 둔다. */}
      <section className={styles.allMenuSection}>
        <h3 className={`body-l-semi text-primary ${styles.sectionTitle}`}>전체 메뉴</h3>
        <SheetMenuList menus={data?.menu_list ?? []} isPending={isPending} isError={isError} />
      </section>
    </>
  );
}

export default function RestaurantDetailSheet({ restaurant, onBack }: RestaurantDetailSheetProps) {
  return (
    <section>
      <MapSheetHeader
        title={restaurant.name}
        description={
          <>
            <span>{restaurant.category}</span>
            <span>{formatDistance(restaurant.distance)}</span>
          </>
        }
        onBack={onBack}
      />
      {restaurant.restaurantId === null ? (
        <div className={styles.preparing} role="status">
          <SystemIcon name="hourglass-empty" size={20} className="text-tertiary" />
          <p className="body-m-medium text-tertiary">메뉴 업데이트를 준비 중이에요</p>
        </div>
      ) : (
        <RestaurantMenuSections restaurantId={restaurant.restaurantId} />
      )}
    </section>
  );
}
