import { useEffect, useRef } from "react";

import type { NearbyCategory } from "@/features/restaurant/api/nearbyRestaurant.api";
import {
  useNearbyRestaurantsQuery,
  useRestaurantBrandsQuery,
} from "@/features/restaurant/hooks/queries/restaurant.query";
import type { SheetRestaurant } from "@/features/restaurant/hooks/useMapSheet";
import sheetStyles from "@/features/restaurant/styles/MapSheetView.module.css";
import styles from "@/features/restaurant/styles/NearbyRestaurantList.module.css";
import type { LatLng } from "@/features/restaurant/utils/currentLocation.util";
import { formatDistance } from "@/features/restaurant/utils/distance.util";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";

type NearbyRestaurantListProps = {
  category: NearbyCategory;
  center: LatLng | null;
  keyword: string;
  isMapAreaSearch: boolean;
  onSelectRestaurant: (restaurant: SheetRestaurant) => void;
};

function getListTitle(keyword: string, isMapAreaSearch: boolean, count: number) {
  if (keyword) return `'${keyword}' 검색 결과 ${count}곳`;
  if (isMapAreaSearch) return `현 지도 기준 식당 ${count}곳`;
  return `내 주변 식당 ${count}곳`;
}

export default function NearbyRestaurantList({
  category,
  center,
  keyword,
  isMapAreaSearch,
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
  const meloCount = restaurants.filter(({ id }) => brandByPlaceId.get(id)).length;

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
      <header className={styles.header}>
        <h2 className="title-m-semi text-primary">
          {getListTitle(keyword, isMapAreaSearch, restaurants.length)}
        </h2>
        {restaurants.length > 0 && brandByPlaceId.size > 0 && (
          <p className="body-s-regular text-tertiary">멜로 등록 식당 {meloCount}곳</p>
        )}
      </header>
      {restaurants.length === 0 ? (
        <div className={styles.state} role="status">
          <SystemIcon name="search" size={20} className="text-disabled" />
          <p className="body-m-medium text-disabled">근처에 해당하는 식당이 없어요</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {restaurants.map((restaurant) => {
            const brand = brandByPlaceId.get(restaurant.id);

            return (
              <li key={restaurant.id}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() =>
                    onSelectRestaurant({
                      ...restaurant,
                      restaurantId: brand?.restaurant_id ?? null,
                    })
                  }
                >
                  <span className={styles.itemText}>
                    <span className={styles.nameRow}>
                      <span className="body-l-semi text-primary">{restaurant.name}</span>
                      {brand && (
                        <span className={`caption-m-medium ${styles.meloBadge}`}>멜로 등록</span>
                      )}
                    </span>
                    <span className={`body-s-regular text-tertiary ${sheetStyles.divided}`}>
                      <span>{restaurant.category}</span>
                      <span>{formatDistance(restaurant.distance)}</span>
                      {brand === null && <span>메뉴를 준비중이에요</span>}
                    </span>
                  </span>
                  <SystemIcon name="chevron-right" size={20} className="text-tertiary" />
                </button>
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
