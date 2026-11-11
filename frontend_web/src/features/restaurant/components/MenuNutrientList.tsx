import { Tabs } from "@base-ui/react";

import {
  BEST_OPTIONS,
  type BestFilter,
} from "@/features/restaurant/constants/restaurantBest.constant";
import { useRestaurantDetailQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import styles from "@/features/restaurant/styles/MapSheetView.module.css";
import type { RestaurantMenuResponseDto } from "@/shared/api/types/api.response.dto";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";

const NUTRIENTS = [
  { key: "sugars", label: "당류" },
  { key: "protein", label: "단백질" },
  { key: "sat_fat", label: "포화지방" },
] as const;

const BEST_MENU_COUNT = 5;

// 선택한 탭의 패널만 그려지므로, 탭을 눌렀을 때 그 기준으로 처음 요청한다.
function BestMenuList({ restaurantId, filter }: { restaurantId: number; filter: BestFilter }) {
  const { data, isPending, isError } = useRestaurantDetailQuery({
    restaurant_id: restaurantId,
    filter,
  });

  return (
    <MenuNutrientList
      // 서버가 추천 순서로 정렬해 준다고 보고 앞에서부터 자른다.
      menus={data?.menu_list.slice(0, BEST_MENU_COUNT) ?? []}
      isPending={isPending}
      isError={isError}
      ranked
    />
  );
}

// 시트 상세와 식당 상세 페이지에서 같이 쓰는 BEST 탭
export function BestMenuTabs({ restaurantId }: { restaurantId: number }) {
  return (
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
  );
}

type MenuNutrientListProps = {
  menus: RestaurantMenuResponseDto[];
  isPending: boolean;
  isError: boolean;
  // BEST 목록이면 앞에 순위를 붙인다.
  ranked?: boolean;
};

export default function MenuNutrientList({
  menus,
  isPending,
  isError,
  ranked = false,
}: MenuNutrientListProps) {
  if (isPending) {
    return (
      <SkeletonStatus label="메뉴를 불러오는 중입니다.">
        <ul className={styles.menuList}>
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index} className={styles.menuItem}>
              {ranked && <span className={`body-s-semi ${styles.rank}`}>{index + 1}</span>}
              <div className={styles.menuText}>
                <Skeleton width="40%" height={24} />
                <Skeleton width="65%" height={20} />
              </div>
              <Skeleton width={56} height={22} />
            </li>
          ))}
        </ul>
      </SkeletonStatus>
    );
  }

  if (isError) {
    return (
      <div className={styles.menuState} role="alert">
        <p className="body-m-medium text-tertiary">메뉴를 불러오지 못했어요</p>
      </div>
    );
  }

  if (menus.length === 0) {
    return (
      <div className={styles.menuState} role="status">
        <p className="body-m-medium text-tertiary">표시할 메뉴가 없어요</p>
      </div>
    );
  }

  return (
    <ul className={styles.menuList}>
      {menus.map((menu, index) => (
        <li key={menu.menu_id} className={styles.menuItem}>
          {ranked && <span className={`body-s-semi ${styles.rank}`}>{index + 1}</span>}
          <div className={styles.menuText}>
            <p className={`body-l-medium text-primary ${styles.menuTitle}`}>
              <span className={`caption-m-medium text-tertiary ${styles.category}`}>
                {menu.menu_category}
              </span>
              {menu.menu_name}
            </p>
            <p className={`body-s-regular text-tertiary ${styles.divided}`}>
              {NUTRIENTS.map(({ key, label }) => (
                <span key={key}>
                  {label} {menu[key] == null ? "-" : `${formatDisplayNumber(menu[key])}g`}
                </span>
              ))}
            </p>
          </div>
          <p className="body-l-medium text-primary textNoWrap">
            {formatDisplayNumber(menu.calories)} kcal
          </p>
        </li>
      ))}
    </ul>
  );
}
