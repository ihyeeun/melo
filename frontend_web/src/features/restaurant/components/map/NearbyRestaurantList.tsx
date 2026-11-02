import { useEffect, useRef } from "react";

import {
  type NearbyCategory,
  SEARCH_RADIUS_METERS,
} from "@/features/restaurant/api/nearbyRestaurant.api";
import { useNearbyRestaurantsQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import styles from "@/features/restaurant/styles/NearbyRestaurantList.module.css";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";

type NearbyRestaurantListProps = {
  category: NearbyCategory;
  center: LatLng | null;
};

function formatDistance(meters: number) {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

export default function NearbyRestaurantList({ category, center }: NearbyRestaurantListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, isPending, isError, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useNearbyRestaurantsQuery(category, center);
  const restaurants = data?.pages.flatMap((page) => page.restaurants) ?? [];

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isError || isFetchingNextPage) return;

    // 시트가 다 펼쳐져 목록 끝이 화면에 보일 때만 다음 페이지를 요청한다.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "160px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage, restaurants.length]);

  if (isPending) {
    return (
      <div className={styles.state}>
        <LoadingIndicator iconSize={28} label="주변 식당을 찾는 중입니다." />
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className={styles.state} role={isError ? "alert" : "status"}>
        <p className="body-m-medium text-tertiary">
          {isError
            ? "주변 식당을 불러오지 못했어요"
            : `주변 ${SEARCH_RADIUS_METERS / 1000}km 안에 식당이 없어요`}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.list}>
        {restaurants.map((restaurant) => (
          <li key={restaurant.id} className={styles.item}>
            <p className="body-l-medium text-primary">{restaurant.name}</p>
            <p className="caption-m-medium text-secondary">
              {restaurant.category} · {formatDistance(restaurant.distance)}
            </p>
          </li>
        ))}
      </ul>
      <div ref={loadMoreRef} className={styles.loadMore}>
        {isFetchingNextPage && (
          <LoadingIndicator iconSize={24} label="식당을 더 불러오는 중입니다." />
        )}
        {isError && (
          <p className="caption-m-medium text-tertiary" role="alert">
            식당을 더 불러오지 못했어요
          </p>
        )}
      </div>
    </>
  );
}
