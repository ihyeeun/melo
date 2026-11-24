import { Tabs } from "@base-ui/react";

import {
  BEST_OPTIONS,
  type BestFilter,
} from "@/features/restaurant/constants/restaurantBest.constant";
import { useRestaurantDetailQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import styles from "@/features/restaurant/styles/MapSheetView.module.css";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import type { RestaurantMenuResponseDto } from "@/shared/api/types/api.response.dto";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";

const NUTRIENTS = [
  { key: "sugars", label: "당류" },
  { key: "protein", label: "단백질" },
  { key: "sat_fat", label: "포화지방" },
] as const;

const BEST_MENU_COUNT = 5;
// restaurant_menu_tab_click의 tab 값
const BEST_TAB_EVENT_VALUE: Record<BestFilter, string> = {
  균형: "balance",
  저칼로리: "low_calorie",
  단백질: "protein",
};
const MISSING_NUTRIENT_MESSAGES = ["일부 영양성분 정보는 판매사에서 제공하고 있지 않아요"] as const;

// 판매사가 공개하지 않은 값(빈 값)인지. 0은 공개한 값이다
function isUndisclosed(value: number | null | undefined): value is null | undefined {
  return value == null || !Number.isFinite(value);
}

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
  // BEST 기준은 정렬만 다르고 대상 메뉴는 같아서, 첫 탭이 비면 추천할 메뉴가 없는 식당이다
  const { data: defaultBest } = useRestaurantDetailQuery({
    restaurant_id: restaurantId,
    filter: BEST_OPTIONS[0].filter,
  });

  // 사용자가 탭을 눌렀을 때만 불린다 (처음 보이는 [균형 BEST]는 세지 않음)
  const handleTabChange = (value: BestFilter) => {
    track(EVENT_NAME.RESTAURANT_MENU_TAB_CLICK, { tab: BEST_TAB_EVENT_VALUE[value] });
  };

  if (defaultBest && defaultBest.menu_list.length === 0) {
    return (
      <div className={styles.noBestMenu} role="status">
        <p className="body-l-medium text-disabled">추천할 식사 메뉴가 없어요</p>
      </div>
    );
  }

  return (
    <Tabs.Root defaultValue={BEST_OPTIONS[0].filter} onValueChange={handleTabChange}>
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
      {menus.map((menu, index) => {
        // 판매사가 공개하지 않은 영양성분은 빈칸 · 0 · '-'로 두지 않고 숨긴다 (P6)
        const disclosedNutrients = NUTRIENTS.filter(({ key }) => !isUndisclosed(menu[key]));
        const hasUndisclosed =
          isUndisclosed(menu.calories) || disclosedNutrients.length < NUTRIENTS.length;

        return (
          <li key={menu.menu_id} className={styles.menuItem}>
            {ranked && <span className={`body-s-semi ${styles.rank}`}>{index + 1}</span>}
            <div className={styles.menuText}>
              <p className={`body-l-medium text-primary ${styles.menuTitle}`}>
                <span className="ellipsis">{menu.menu_name}</span>
                {/* 메뉴 종류는 이름 바로 옆 작은 회색 글씨. 이름이 길면 이름만 줄인다 */}
                {menu.menu_category && (
                  <span className={`body-xs-regular text-tertiary ${styles.category}`}>
                    {menu.menu_category}
                  </span>
                )}
                {hasUndisclosed && (
                  <InfoPopover
                    ariaLabel="영양성분 정보 안내"
                    messages={MISSING_NUTRIENT_MESSAGES}
                    iconSize={16}
                    side="bottom"
                    align="center"
                  />
                )}
              </p>
              {disclosedNutrients.length > 0 && (
                <p className={`body-s-regular text-tertiary ${styles.divided}`}>
                  {disclosedNutrients.map(({ key, label }) => (
                    <span key={key}>
                      {label} {formatDisplayNumber(menu[key] ?? 0)}g
                    </span>
                  ))}
                </p>
              )}
            </div>
            {!isUndisclosed(menu.calories) && (
              <p className="body-l-medium text-primary textNoWrap">
                {formatDisplayNumber(menu.calories)} kcal
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
