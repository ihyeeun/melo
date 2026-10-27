import { useEffect, useRef, useState } from "react";

import { useRestaurantSearchQuery } from "@/features/restaurant/hooks/queries/restaurant.query";
import styles from "@/features/restaurant/styles/RestaurantPage.module.css";
import { getRestaurantCategoryAppearance } from "@/features/restaurant/utils/restaurantCategoryIcon";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { SearchInput } from "@/shared/commons/input/SearchInput";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { ScrollFogArea } from "@/shared/commons/scrollFog";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

export default function RestaurantPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isSearchInteractionActiveRef = useRef(false);
  const { data, isPending, isError, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useRestaurantSearchQuery(keyword);
  const restaurants = data?.pages.flatMap((page) => page.restaurant_list) ?? [];

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isError || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "160px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage, keyword, restaurants.length]);

  return (
    <div className={`page ${styles.root}`}>
      <PageHeader title="식당" />

      <button type="button" onClick={() => navigate(PATH.MAP)}>
        지도
      </button>

      <section
        className={styles.searchSection}
        onFocus={(event) => {
          if (!(event.target instanceof HTMLInputElement) || isSearchInteractionActiveRef.current) {
            return;
          }

          isSearchInteractionActiveRef.current = true;
          track(EVENT_NAME.RESTAURANT_SEARCH_FOCUS);
        }}
        onBlur={(event) => {
          // 지우기 버튼과 입력창 사이의 포커스 이동은 같은 검색 동작으로 본다.
          if (!event.currentTarget.contains(event.relatedTarget)) {
            isSearchInteractionActiveRef.current = false;
          }
        }}
      >
        <SearchInput
          value={input}
          onValueChange={(value) => {
            setInput(value);

            if (!value.trim()) {
              setKeyword("");
            }
          }}
          onEnter={(value) => {
            setKeyword(value.trim());
          }}
          placeholder="식당명을 검색해보세요"
          inputClassName="amp-unmask"
        />
      </section>
      <ScrollFogArea className={styles.content}>
        {isPending ? (
          <div className={styles.state}>
            <LoadingIndicator iconSize={28} label="식당을 불러오는 중입니다." />
          </div>
        ) : (
          <>
            <ul className={styles.restaurantList}>
              {restaurants.map((restaurant) => {
                const categoryAppearance = getRestaurantCategoryAppearance(restaurant.category);

                return (
                  <li key={restaurant.restaurant_id}>
                    <button
                      type="button"
                      className={styles.restaurantCard}
                      onClick={() => {
                        track(EVENT_NAME.RESTAURANT_CARD_CLICK, {
                          restaurant_name: restaurant.restaurant_name,
                        });
                        navigate(
                          `${PATH.RESTAURANT_DETAIL}?restaurantId=${restaurant.restaurant_id}`,
                          { state: restaurant },
                        );
                      }}
                    >
                      <span
                        className={styles.restaurantIcon}
                        style={{ backgroundColor: categoryAppearance.backgroundColor }}
                        aria-hidden="true"
                      >
                        {categoryAppearance.emoji}
                      </span>
                      <span className={styles.restaurantInfo}>
                        <span className="body-l-medium text-primary">
                          {restaurant.restaurant_name}
                        </span>
                        {restaurant.category && (
                          <span className={`caption-m-medium text-secondary ${styles.category}`}>
                            {restaurant.category}
                          </span>
                        )}
                      </span>
                      <SystemIcon name="chevron-right" size={18} className="text-secondary" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {isError ? (
              <div className={styles.state} role="alert">
                <p className="body-l-medium text-tertiary">식당 목록을 불러오지 못했어요</p>
              </div>
            ) : restaurants.length === 0 ? (
              <div className={styles.state} role="status">
                <img src="/icons/characters/question.png" alt="" width={200} />
                <p className="body-l-medium text-tertiary">
                  {keyword.trim() ? "검색 결과가 없어요" : "등록된 식당이 없어요"}
                </p>
              </div>
            ) : null}
            <div ref={loadMoreRef} className={styles.loadMore}>
              {isFetchingNextPage && (
                <LoadingIndicator iconSize={28} label="식당을 더 불러오는 중입니다." />
              )}
            </div>
          </>
        )}
      </ScrollFogArea>
    </div>
  );
}
