import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getSearchWorkout,
  getTodayWorkoutRecord,
  getWorkoutDetail,
} from "@/features/health/api/health-record.api";
import type { SearchWorkoutRequestDto } from "@/shared/api/types/api.request.dto";

export const workoutKeys = {
  all: ["workout"] as const,

  records: {
    all: () => [...workoutKeys.all, "records"] as const,
    byDate: (date: string) => [...workoutKeys.records.all(), date] as const,
  },

  catalog: {
    all: () => [...workoutKeys.all, "catalog"] as const,

    lists: {
      all: () => [...workoutKeys.catalog.all(), "lists"] as const,
      search: (params: Omit<SearchWorkoutRequestDto, "cursor">) =>
        [...workoutKeys.catalog.all(), "search", params] as const,
    },

    previews: {
      all: () => [...workoutKeys.catalog.all(), "previews"] as const,
      byId: (workoutId: number) => [...workoutKeys.catalog.previews.all(), workoutId] as const,
    },

    details: {
      all: () => [...workoutKeys.catalog.all(), "details"] as const,
      byId: (workoutId: number) => [...workoutKeys.catalog.details.all(), workoutId] as const,
    },
  },
};

export function useGetWorkoutRecordQuery(date: string) {
  return useQuery({
    queryKey: workoutKeys.records.byDate(date),
    queryFn: () => getTodayWorkoutRecord(date),
    staleTime: Infinity,
  });
}

export function useGetWorkoutDetailQuery(workoutId: number) {
  return useQuery({
    queryKey: workoutKeys.catalog.details.byId(workoutId),
    queryFn: () => getWorkoutDetail(workoutId),
    staleTime: Infinity,
  });
}

export function useWorkoutSearchInfiniteQuery(params: SearchWorkoutRequestDto) {
  const { cursor, ...paramsWithoutCursor } = params;
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: workoutKeys.catalog.lists.search(paramsWithoutCursor),
    queryFn: async ({ pageParam }) => {
      const response = await getSearchWorkout({
        ...paramsWithoutCursor,
        cursor: pageParam ?? cursor,
      });

      response.workout_list.forEach((workout) => {
        queryClient.setQueryData(workoutKeys.catalog.previews.byId(workout.workout_id), workout);
      });

      return {
        workoutIds: response.workout_list.map((workout) => workout.workout_id),
        next_cursor: response.next_cursor,
      };
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}
