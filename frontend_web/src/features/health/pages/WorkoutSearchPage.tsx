import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { useDeleteWorkoutRecordMutation } from "@/features/health/hooks/mutations/workout.mutation";
import {
  useGetWorkoutRecordQuery,
  useWorkoutSearchInfiniteQuery,
  workoutKeys,
} from "@/features/health/hooks/queries/workout.query";
import {
  useRemoveWorkoutRecordEditRecord,
  useWorkoutRecordEditDate,
  useWorkoutRecordEditRecords,
} from "@/features/health/stores/workoutRecordEdit.store";
import {
  getWorkoutDetailSheetPath,
  getWorkoutRecordEditPath,
  getWorkoutRecordPath,
  getWorkoutUpsertPath,
} from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import type { WorkoutSearchItemResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { SearchInputHeader } from "@/shared/commons/header/SearchInputHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { ScrollFogArea } from "@/shared/commons/scrollFog";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey, isValidDateKey } from "@/shared/utils/dateFormat";

import styles from "../styles/WorkoutSearchPage.module.css";

const WORKOUT_SEARCH_PAGE_LIMIT = 20;
const BODY_PART_OPTIONS = ["유산소", "가슴", "등", "하체", "어깨", "팔"] as const;
const EQUIPMENT_OPTIONS = [
  "바벨",
  "덤벨",
  "케틀벨",
  "밴드",
  "폼롤러",
  "머신",
  "스미스 머신",
  "맨몸",
  "케이블 머신",
  "기타",
] as const;

function getSafeWorkoutDateKey(rawDate: string | null) {
  return rawDate && isValidDateKey(rawDate) ? rawDate : getTodayFormatDateKey();
}

function isWorkoutEditMode(rawMode: string | null) {
  return rawMode === "edit";
}

function trackWorkoutRecordCompleted() {
  track(EVENT_NAME.WORKOUT_RECORD_COMPLETED, {
    source: "workout_add",
  });
}

export default function WorkoutSearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dateKey = getSafeWorkoutDateKey(searchParams.get("date"));
  const isEditMode = isWorkoutEditMode(searchParams.get("mode"));
  const workoutPathOptions = isEditMode ? ({ mode: "edit" } as const) : undefined;
  const editDate = useWorkoutRecordEditDate();
  const editRecords = useWorkoutRecordEditRecords();
  const removeEditRecord = useRemoveWorkoutRecordEditRecord();
  const isEditSession = isEditMode && editDate === dateKey;
  const workoutRecordQuery = useGetWorkoutRecordQuery(dateKey);
  const { mutate: deleteWorkoutRecord, isPending: isDeletePending } =
    useDeleteWorkoutRecordMutation({
      onError: () => {
        toast.warning("운동 기록을 제외하지 못했어요", "잠시 후 다시 시도해주세요.");
      },
    });
  const inputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const initialWorkoutIdSetRef = useRef<Set<number> | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const hasSearchCondition =
    searchKeyword.trim().length > 0 || bodyPart !== null || equipment !== null;
  const searchParamsDto = useMemo(
    () => ({
      input: searchKeyword,
      body_part_major: bodyPart ?? undefined,
      equipment_category: equipment ?? undefined,
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
  const selectedWorkoutRecordMap = useMemo(() => {
    const records = isEditSession ? editRecords : (workoutRecordQuery.data?.workout_list ?? []);

    return new Map(records.map((record) => [record.workout_id, record]));
  }, [editRecords, isEditSession, workoutRecordQuery.data?.workout_list]);

  useEffect(() => {
    if (isEditMode || !workoutRecordQuery.data || initialWorkoutIdSetRef.current !== null) {
      return;
    }

    initialWorkoutIdSetRef.current = new Set(
      workoutRecordQuery.data.workout_list.map((record) => record.workout_id),
    );
  }, [isEditMode, workoutRecordQuery.data]);

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
      fallbackTo: isEditMode ? getWorkoutRecordEditPath(dateKey) : getWorkoutRecordPath(dateKey),
    });
  };

  const hasAddedWorkoutRecord = () => {
    const initialWorkoutIdSet = initialWorkoutIdSetRef.current;
    if (isEditMode || initialWorkoutIdSet === null) return false;

    return (
      workoutRecordQuery.data?.workout_list.some(
        (record) => !initialWorkoutIdSet.has(record.workout_id),
      ) ?? false
    );
  };

  const handleComplete = () => {
    if (hasAddedWorkoutRecord()) {
      toast.success("운동 기록을 완료했어요");
      trackWorkoutRecordCompleted();
    }

    handleBack();
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

  const handleUpsertWorkout = (workoutId: number) => {
    navigate(getWorkoutUpsertPath(dateKey, workoutId, workoutPathOptions), {
      state: {
        workoutRecord: selectedWorkoutRecordMap.get(workoutId),
      },
    });
  };

  const handleRemoveWorkout = (workoutId: number) => {
    if (isDeletePending || !selectedWorkoutRecordMap.has(workoutId)) return;

    if (isEditSession) {
      removeEditRecord(workoutId);
      return;
    }

    deleteWorkoutRecord({ date: dateKey, workout_id: workoutId });
  };

  const handleWorkoutDetail = (workoutId: number) => {
    navigate(getWorkoutDetailSheetPath(dateKey, workoutId, workoutPathOptions));
  };

  const renderSearchState = () => {
    if (isPending) {
      return (
        <section className={styles.loadingContainer}>
          <LoadingIndicator label="운동을 검색하는 중입니다." />
        </section>
      );
    }

    if (isError) {
      return (
        <section className={styles.emptyWorkoutListSection}>
          <p className="body-l-medium">운동을 검색하지 못했어요</p>
          <Button
            variant="text"
            size="xs"
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
        <section className={styles.emptyWorkoutListSection}>
          <img src="/icons/characters/question.png" width={200} />
          <p className="body-l-medium text-tertiary">
            {hasSearchCondition ? "검색 결과가 없어요" : "표시할 운동이 없어요"}
          </p>
        </section>
      );
    }

    return (
      <section className={styles.workoutResultListSection}>
        {workouts.map((workout) => (
          <WorkoutSearchResultCard
            key={workout.workout_id}
            workout={workout}
            isSelected={selectedWorkoutRecordMap.has(workout.workout_id)}
            disabled={isDeletePending}
            onUpsert={() => handleUpsertWorkout(workout.workout_id)}
            onRemove={() => handleRemoveWorkout(workout.workout_id)}
            onDetail={() => handleWorkoutDetail(workout.workout_id)}
          />
        ))}
        <div ref={loadMoreRef} className={styles.loadMoreState}>
          {isFetchingNextPage ? (
            <LoadingIndicator iconSize={24} label="운동을 더 불러오는 중입니다." />
          ) : null}
        </div>
      </section>
    );
  };

  return (
    <section className={`${styles.page} page`}>
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

        <ScrollFogArea sizes={{ top: 10, bottom: 20 }}>{renderSearchState()}</ScrollFogArea>
      </main>

      <footer className={`footer`}>
        <Button fullWidth size="m" disabled={isDeletePending} onClick={handleComplete}>
          추가 완료
        </Button>
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
        <button
          type="button"
          className={`${styles.filterChip} ${value === null ? styles.filterChipSelected : ""} body-s-medium`}
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          전체
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.filterChip} ${value === option ? styles.filterChipSelected : ""} body-s-medium`}
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
        <button
          type="button"
          className={`${styles.filterTab} ${value === null ? styles.tabSelected : ""} body-s-medium`}
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          부위
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={value === option}
            className={`${styles.filterTab} ${value === option ? styles.tabSelected : ""} body-s-medium`}
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
  disabled,
  isSelected,
  onUpsert,
  onRemove,
  onDetail,
  workout,
}: {
  disabled: boolean;
  isSelected: boolean;
  onUpsert: () => void;
  onRemove: () => void;
  onDetail: () => void;
  workout: WorkoutSearchItemResponseDto;
}) {
  return (
    <SelectedCard isSelected={isSelected} className={styles.workoutCard}>
      <button
        type="button"
        className={styles.workoutInfoActionButton}
        aria-label={
          isSelected ? `${workout.workout_name} 기록 수정하기` : `${workout.workout_name} 상세 보기`
        }
        disabled={disabled}
        onClick={isSelected ? onUpsert : onDetail}
      >
        <div className={styles.workoutImageArea}>
          {workout.workout_image ? (
            <img src={workout.workout_image} alt="" className={styles.thumbnailImage} />
          ) : (
            <SystemIcon
              name={workout.workout_type === "cardio" ? "walking" : "fitness"}
              size={28}
            />
          )}
        </div>

        <p className={`body-l-medium text-primary ${styles.workoutName}`}>{workout.workout_name}</p>
      </button>

      <button
        type="button"
        className={`${styles.addButton}`}
        data-selected={isSelected}
        aria-label={
          isSelected
            ? `${workout.workout_name} 기록에서 제외하기`
            : `${workout.workout_name} 추가하기`
        }
        aria-pressed={isSelected}
        disabled={disabled}
        onClick={isSelected ? onRemove : onUpsert}
      >
        <SystemIcon name={isSelected ? "minus" : "plus"} size={18} />
      </button>
    </SelectedCard>
  );
}
