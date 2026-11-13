import MenuNutrientList, { BestMenuTabs } from "@/features/restaurant/components/MenuNutrientList";
import { useRestaurantDetailQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import sheetStyles from "@/features/restaurant/styles/MapSheetView.module.css";
import styles from "@/features/restaurant/styles/RestaurantPage.module.css";
import { formatDistance } from "@/features/restaurant/utils/distance.util";
import { PATH } from "@/router/path";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import {
  navigateBack,
  useLocation,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

// 지도 시트의 '식당 메뉴 전체 보기'로 들어온다. 시트에서 본 식당 정보는 state로 받는다.
export default function RestaurantMenuPage() {
  const [searchParams] = useSearchParams();
  const { state: restaurant } = useLocation<SheetRestaurant>();
  const restaurantId = Number(searchParams.get("restaurantId"));
  const { data, isPending, isError } = useRestaurantDetailQuery({ restaurant_id: restaurantId });
  const isValidId = Number.isSafeInteger(restaurantId) && restaurantId > 0;

  return (
    <section className={`page ${styles.root}`}>
      <header className={styles.header}>
        <PageHeader
          title="식당 상세"
          onBack={() => navigateBack({ fallbackTo: PATH.RESTAURANT })}
        />
      </header>
      {isValidId ? (
        <main className={`main ${styles.menuPageMain}`}>
          <div className={styles.menuPageSummary}>
            <h1 className="title-l-semi text-primary">
              {restaurant?.name ?? data?.restaurant_name}
            </h1>
            {restaurant && (
              <p className={`body-s-regular text-tertiary ${sheetStyles.divided}`}>
                <span>{restaurant.category}</span>
                <span>{formatDistance(restaurant.distance)}</span>
              </p>
            )}
          </div>
          <BestMenuTabs restaurantId={restaurantId} />
          <section className={styles.menuPageAllMenu}>
            <h2 className="title-s-semi text-primary">전체 메뉴</h2>
            <MenuNutrientList
              menus={data?.menu_list ?? []}
              isPending={isPending}
              isError={isError}
            />
          </section>
        </main>
      ) : (
        <p className={`${styles.state} body-l-medium`} role="alert">
          식당 정보를 확인할 수 없어요
        </p>
      )}
    </section>
  );
}
