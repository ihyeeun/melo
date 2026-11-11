import styles from "@/features/restaurant/styles/MapSheetView.module.css";
import type { RestaurantMenuResponseDto } from "@/shared/api/types/api.response.dto";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";

const NUTRIENTS = [
  { key: "sugars", label: "당류" },
  { key: "protein", label: "단백질" },
  { key: "sat_fat", label: "포화지방" },
] as const;

type SheetMenuListProps = {
  menus: RestaurantMenuResponseDto[];
  isPending: boolean;
  isError: boolean;
  // BEST 목록이면 앞에 순위를 붙인다.
  ranked?: boolean;
};

export default function SheetMenuList({
  menus,
  isPending,
  isError,
  ranked = false,
}: SheetMenuListProps) {
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
