import MapSheetHeader from "@/features/restaurant/components/map/MapSheetHeader";
import { BestMenuTabs } from "@/features/restaurant/components/MenuNutrientList";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import styles from "@/features/restaurant/styles/MapSheetView.module.css";
import { formatDistance } from "@/features/restaurant/utils/distance.util";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

type RestaurantDetailSheetProps = {
  restaurant: SheetRestaurant;
  onBack: () => void;
};

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
          <SystemIcon name="hourglass-empty" size={20} className="text-disabled" />
          <p className="body-m-medium text-disabled">메뉴 업데이트를 준비 중이에요</p>
        </div>
      ) : (
        <BestMenuTabs restaurantId={restaurant.restaurantId} />
      )}
    </section>
  );
}
