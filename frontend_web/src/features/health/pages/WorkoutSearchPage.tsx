import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useWorkoutSearchInfiniteQuery,
  workoutKeys,
} from "@/features/health/hooks/queries/workout.query";
import {
  getWorkoutDetailSheetPath,
  getWorkoutRecordPath,
  getWorkoutUpsertPath,
} from "@/router/pathHelpers";
import type { WorkoutSearchItemResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { SearchInputHeader } from "@/shared/commons/header/SearchInputHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey, isValidDateKey } from "@/shared/utils/dateFormat";

import styles from "../styles/WorkoutSearchPage.module.css";

const WORKOUT_SEARCH_PAGE_LIMIT = 20;
const BODY_PART_OPTIONS = ["가슴", "등", "하체", "어깨", "삼두", "이두", "코어"] as const;
const EQUIPMENT_OPTIONS = ["기구", "바벨", "덤벨", "케틀벨", "밴드", "머신", "스미스"] as const;

function getSafeWorkoutDateKey(rawDate: string | null) {
  return rawDate && isValidDateKey(rawDate) ? rawDate : getTodayFormatDateKey();
}

export default function WorkoutSearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dateKey = getSafeWorkoutDateKey(searchParams.get("date"));
  const inputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const hasSearchCondition =
    searchKeyword.trim().length > 0 || bodyPart !== null || equipment !== null;
  const searchParamsDto = useMemo(
    () => ({
      input: searchKeyword,
      body_parts: bodyPart ?? undefined,
      equipments: equipment ?? undefined,
      limit: WORKOUT_SEARCH_PAGE_LIMIT,
    }),
    [bodyPart, equipment, searchKeyword],
  );
  const {
    data: searchResults,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useWorkoutSearchInfiniteQuery(searchParamsDto);
  const workoutIds = useMemo(
    () => searchResults?.pages.flatMap((page) => page.workoutIds) ?? [],
    [searchResults?.pages],
  );
  const workouts = useMemo(
    () =>
      workoutIds.flatMap((workoutId) => {
        const workout = queryClient.getQueryData<WorkoutSearchItemResponseDto>(
          workoutKeys.catalog.previews.byId(workoutId),
        );

        return workout ? [workout] : [];
      }),
    [queryClient, workoutIds],
  );

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || isFetchingNextPage) {
          return;
        }

        void fetchNextPage();
      },
      {
        rootMargin: "160px 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, workouts.length]);

  const handleBack = () => {
    navigateBack({
      fallbackTo: getWorkoutRecordPath(dateKey),
    });
  };

  const handleClearKeyword = () => {
    setInputValue("");
    setSearchKeyword("");
    inputRef.current?.focus();
  };

  const handleBodyPartClick = (nextBodyPart: string | null) => {
    setBodyPart((current) => (current === nextBodyPart ? null : nextBodyPart));
  };

  const handleEquipmentClick = (nextEquipment: string | null) => {
    setEquipment((current) => (current === nextEquipment ? null : nextEquipment));
  };

  const handleAddWorkout = (workoutId: number) => {
    navigate(getWorkoutUpsertPath(dateKey, workoutId));
  };

  const handleWorkoutDetail = (workoutId: number) => {
    navigate(getWorkoutDetailSheetPath(dateKey, workoutId));
  };

  const renderSearchState = () => {
    if (!hasSearchCondition) {
      return (
        <section className={styles.emptyState}>
          <p className="typo-body2">운동명이나 필터로 검색해보세요</p>
        </section>
      );
    }

    if (isPending) {
      return (
        <section className={styles.loadingContainer}>
          <LoadingIndicator label="운동을 검색하는 중입니다." />
        </section>
      );
    }

    if (isError) {
      return (
        <section className={styles.emptyState}>
          <p className="typo-body2">운동을 검색하지 못했어요</p>
          <Button
            variant="text"
            color="normal"
            size="small"
            onClick={() => {
              void refetch();
            }}
          >
            다시 시도
          </Button>
        </section>
      );
    }

    if (workouts.length === 0) {
      return (
        <section className={styles.emptyState}>
          <p className="typo-body2">검색 결과가 없어요</p>
        </section>
      );
    }

    return (
      <div className={styles.resultList}>
        {workouts.map((workout) => (
          <WorkoutSearchResultCard
            key={workout.workout_id}
            workout={workout}
            onAdd={() => handleAddWorkout(workout.workout_id)}
            onDetail={() => handleWorkoutDetail(workout.workout_id)}
          />
        ))}
        <div ref={loadMoreRef} className={styles.loadMoreState}>
          {isFetchingNextPage ? (
            <LoadingIndicator iconSize={24} label="운동을 더 불러오는 중입니다." />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <section className={styles.page}>
      <SearchInputHeader
        value={inputValue}
        onValueChange={setInputValue}
        onEnter={(value) => setSearchKeyword(value.trim())}
        onClear={handleClearKeyword}
        inputRef={inputRef}
        placeholder="운동 이름을 검색해보세요"
        inputAriaLabel="운동 검색"
        onBack={handleBack}
      />

      <main className={styles.main}>
        <section className={styles.filterSection} aria-label="운동 검색 필터">
          <FilterTabGroup
            options={BODY_PART_OPTIONS}
            value={bodyPart}
            onChange={handleBodyPartClick}
          />
          <FilterChipGroup
            options={EQUIPMENT_OPTIONS}
            value={equipment}
            onChange={handleEquipmentClick}
          />
        </section>

        <section className={styles.resultSection}>{renderSearchState()}</section>
      </main>

      <footer className={styles.footer}>
        <Button fullWidth>추가 완료</Button>
      </footer>
    </section>
  );
}

function FilterChipGroup({
  onChange,
  options,
  value,
}: {
  onChange: (value: string | null) => void;
  options: readonly string[];
  value: string | null;
}) {
  return (
    <div className={styles.filterGroup}>
      <div className={styles.filterScroller}>
        {/* <button
          type="button"
          className={`${styles.filterChip} ${value === null ? styles.filterChipSelected : ""} typo-label3`}
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          전체
        </button> */}
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.filterChip} ${value === option ? styles.filterChipSelected : ""} typo-label3`}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterTabGroup({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className={`${styles.filterGroup} ${styles.bgWhite}`}>
      <div className={styles.filterScroller} role="tablist">
        {/* <button
          type="button"
          className={`${styles.filterTab} ${value === null ? styles.tabSelected : ""} typo-label3`}
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          부위
        </button> */}
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={value === option}
            className={`${styles.filterTab} ${value === option ? styles.tabSelected : ""} typo-label3`}
            onClick={() => onChange(value === option ? null : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkoutSearchResultCard({
  onAdd,
  onDetail,
  workout,
}: {
  onAdd: () => void;
  onDetail: () => void;
  workout: WorkoutSearchItemResponseDto;
}) {
  return (
    <article className={styles.resultCard}>
      <button
        type="button"
        className={styles.resultMainButton}
        aria-label={`${workout.workout_name} 상세 보기`}
        onClick={onDetail}
      >
        <div className={styles.thumbnail}>
          {workout.workout_image ? (
            <img src={workout.workout_image} alt="" className={styles.thumbnailImage} />
          ) : (
            <SystemIcon name={workout.workout_type === "cardio" ? "walking" : "fire"} size={28} />
          )}
        </div>

        <div className={styles.resultContent}>
          <h2 className={`${styles.resultTitle} typo-label1`}>{workout.workout_name}</h2>
        </div>
      </button>

      <button
        type="button"
        className={styles.addButton}
        aria-label={`${workout.workout_name} 추가하기`}
        onClick={onAdd}
      >
        <SystemIcon name="plus" size={18} />
      </button>
    </article>
  );
}
