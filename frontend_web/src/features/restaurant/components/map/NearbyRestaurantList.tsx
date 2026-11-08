import { useEffect, useRef } from "react";

import type { NearbyCategory } from "@/features/restaurant/api/nearbyRestaurant.api";
import {
  useNearbyRestaurantsQuery,
  useRestaurantBrandsQuery,
} from "@/features/restaurant/hooks/queries/restaurant.query";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import styles from "@/features/restaurant/styles/NearbyRestaurantList.module.css";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";

type NearbyRestaurantListProps = {
  category: NearbyCategory;
  center: LatLng | null;
  keyword: string;
  onSelectRestaurant: (restaurant: SheetRestaurant) => void;
};

function formatDistance(meters: number) {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

export default function NearbyRestaurantList({
  category,
  center,
  keyword,
  onSelectRestaurant,
}: NearbyRestaurantListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const {
    data,
    isPending,
    isLoadingError,
    isFetchNextPageError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useNearbyRestaurantsQuery(category, center, keyword);
  const restaurants = data?.pages.flatMap((page) => page.restaurants) ?? [];
  const brandByPlaceId = useRestaurantBrandsQuery(
    data?.pages.map((page) => page.restaurants.map(({ id }) => id)) ?? [],
  );
  const listTitle = keyword
    ? `'${keyword}' 검색 결과 ${restaurants.length}곳`
    : `내 주변 식당 ${restaurants.length}곳`;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchNextPageError || isFetchingNextPage) return;

    // 시트가 다 펼쳐져 목록 끝이 화면에 보일 때만 다음 페이지를 요청한다.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "160px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage, restaurants.length]);

  if (isPending) {
    return (
      <div className={styles.state}>
        <LoadingIndicator iconSize={28} label="주변 식당을 찾는 중입니다." />
      </div>
    );
  }

  if (isLoadingError) {
    return (
      <div className={styles.state} role="alert">
        <p className="body-m-medium text-tertiary">식당을 불러오지 못했어요</p>
      </div>
    );
  }

  return (
    <>
      <p>{listTitle}</p>
      {restaurants.length === 0 ? (
        <div className={styles.state} role="status">
          <p className="body-m-medium text-tertiary">근처에 해당하는 식당이 없어요</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {restaurants.map((restaurant) => {
            const brand = brandByPlaceId.get(restaurant.id);
            const itemContent = (
              <>
                <span className="body-l-medium text-primary">{restaurant.name}</span>
                <span className="caption-m-medium text-secondary">
                  {restaurant.category} · {formatDistance(restaurant.distance)}
                  {brand && (
                    <span className={`caption-m-semi ${styles.meloBadge}`}>멜로 식당</span>
                  )}
                </span>
              </>
            );

            return (
              <li key={restaurant.id} className={styles.item}>
                {/* 멜로 식당만 restaurant_id가 있어 상세를 열 수 있다. */}
                {brand ? (
                  <button
                    type="button"
                    className={styles.itemContent}
                    onClick={() =>
                      onSelectRestaurant({
                        restaurantId: brand.restaurant_id,
                        restaurantName: restaurant.name,
                      })
                    }
                  >
                    {itemContent}
                  </button>
                ) : (
                  <div className={styles.itemContent}>{itemContent}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div ref={loadMoreRef} className={styles.loadMore}>
        {isFetchingNextPage && (
          <LoadingIndicator iconSize={24} label="식당을 더 불러오는 중입니다." />
        )}
        {isFetchNextPageError && (
          <p className="caption-m-medium text-tertiary" role="alert">
            식당을 더 불러오지 못했어요
          </p>
        )}
      </div>
    </>
  );
}
