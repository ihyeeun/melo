import { useEffect, useRef } from "react";

import type { NearbyCategory } from "@/features/restaurant/api/nearbyRestaurant.api";
import { useNearbyRestaurantsQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import styles from "@/features/restaurant/styles/NearbyRestaurantList.module.css";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";

type NearbyRestaurantListProps = {
  category: NearbyCategory;
  center: LatLng | null;
  keyword: string;
};

function formatDistance(meters: number) {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

export default function NearbyRestaurantList({
  category,
  center,
  keyword,
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
          {restaurants.map((restaurant) => (
            <li key={restaurant.id} className={styles.item}>
              <p className="body-l-medium text-primary">{restaurant.name}</p>
              <p className="caption-m-medium text-secondary">
                {restaurant.category} · {formatDistance(restaurant.distance)}
              </p>
            </li>
          ))}
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
