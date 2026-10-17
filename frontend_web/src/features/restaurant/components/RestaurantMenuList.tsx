import styles from "@/features/restaurant/styles/RestaurantPage.module.css";
import type { RestaurantMenuResponseDto } from "@/shared/api/types/api.response.dto";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";
import { convertUnitNumToString } from "@/shared/utils/servingUnit";

const NUTRIENTS = [
  { key: "sugars", label: "당류" },
  { key: "protein", label: "단백질" },
  { key: "sat_fat", label: "포화지방" },
] as const;

type Props = {
  menus: RestaurantMenuResponseDto[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
};

export default function RestaurantMenuList({ menus, isPending, isError }: Props) {
  if (isPending) {
    return (
      <div className={styles.state}>
        <LoadingIndicator iconSize={28} label="메뉴를 불러오는 중입니다." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.state} role="alert">
        <p className="body-l-medium text-tertiary">메뉴를 불러오지 못했어요</p>
      </div>
    );
  }

  if (menus.length === 0) {
    return (
      <div className={styles.state}>
        <img src="/icons/characters/question.png" alt="" width={200} />
        <p className={`${styles.state} body-l-medium text-tertiary`} role="status">
          표시할 메뉴가 없어요
        </p>
      </div>
    );
  }

  return (
    <ul className={styles.menuList}>
      {menus.map((menu) => (
        <li key={menu.menu_id} className={styles.menuCard}>
          <div className={styles.menuHeading}>
            <div className={styles.menuMeta}>
              <h3 className="body-l-medium text-primary">{menu.menu_name}</h3>
              <p className="caption-m-regular text-secondary">
                {menu.unit_quantity &&
                  (/^\d/.test(menu.unit_quantity) ? menu.unit_quantity : `1${menu.unit_quantity}`)}
                {menu.weight &&
                  ` (${formatDisplayNumber(menu.weight)}${convertUnitNumToString(menu.unit)})`}
              </p>
            </div>
            <p className="body-l-medium textNoWrap">
              {formatDisplayNumber(menu.calories)} <span className="caption-m-regular">kcal</span>
            </p>
          </div>
          <dl className={styles.nutrients}>
            {NUTRIENTS.map(({ key, label }) => (
              <div key={key} className={styles.nutrientItem}>
                <p className="caption-m-regular text-tertiary textCenter">{label}</p>
                <p className="body-s-regular text-primary textCenter">
                  {menu[key] == null ? (
                    <span className="text-tertiary">-</span>
                  ) : (
                    `${formatDisplayNumber(menu[key])} g`
                  )}
                </p>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
