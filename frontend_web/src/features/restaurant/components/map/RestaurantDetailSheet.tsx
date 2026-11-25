import MapSheetHeader from "@/features/restaurant/components/map/MapSheetHeader";
import { MeloVerifiedBadge } from "@/features/restaurant/components/MeloVerifiedBadge";
import { BestMenuTabs } from "@/features/restaurant/components/MenuNutrientList";
import { BEST_OPTIONS } from "@/features/restaurant/constants/restaurantBest.constant";
import { useRestaurantDetailQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import styles from "@/features/restaurant/styles/MapSheetView.module.css";
import { formatDistance } from "@/features/restaurant/utils/distance.util";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

type RestaurantDetailSheetProps = {
  restaurant: SheetRestaurant;
  onBack: () => void;
};

export default function RestaurantDetailSheet({ restaurant, onBack }: RestaurantDetailSheetProps) {
  // BEST 탭이 처음 부르는 목록과 같은 요청이라 새로 부르지 않는다. 미등록 식당은 0을 넘겨 부르지 않는다
  const { data: defaultBest } = useRestaurantDetailQuery({
    restaurant_id: restaurant.restaurantId ?? 0,
    filter: BEST_OPTIONS[0].filter,
  });
  // 영양성분을 하나도 공개하지 않아 AI가 추정한 값으로 보여 주는 식당 (P6)
  const isAiEstimated = defaultBest?.menu_list.some(
    ({ nutrition_source }) => nutrition_source === "estimated",
  );

  return (
    <section>
      <MapSheetHeader
        title={restaurant.name}
        titleBadge={
          restaurant.restaurantId !== null ? (
            <>
              <MeloVerifiedBadge />
              {isAiEstimated && (
                <span className={`caption-m-medium ${styles.aiEstimatedBadge}`}>AI 추정</span>
              )}
            </>
          ) : null
        }
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
          <SystemIcon name="hourglass-empty" size={20} className="text-disabled" />
          <p className="body-m-medium text-disabled">메뉴를 준비 중이에요</p>
        </div>
      ) : (
        <BestMenuTabs restaurantId={restaurant.restaurantId} />
      )}
    </section>
  );
}
