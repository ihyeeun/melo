import { getProfile } from "@/features/profile/api/profile";
import { queryKeys as profileQueryKeys } from "@/features/profile/hooks/queries/queryKey";
import { appApiData } from "@/shared/api/apiClient";
import { queryClient } from "@/shared/api/queryClient";
import type {
  DateRequestDto,
  ProfileResponseDto,
  WeightStepsResponseDto,
} from "@/shared/api/types/api.dto";
import { isFutureDateKey } from "@/shared/utils/dateFormat";

const END_POINT = {
  BODY_STATS: "/home/weightSteps",
  REGISTER_WEIGHT: "/home/registerWeight",
  REGISTER_STEPS: "/home/registerSteps",
};

async function getCurrentWeight() {
  const cachedProfile = queryClient.getQueryData<ProfileResponseDto>(profileQueryKeys.profile);
  if (typeof cachedProfile?.weight === "number" && Number.isFinite(cachedProfile.weight)) {
    return cachedProfile.weight;
  }

  const profile = await queryClient.fetchQuery({
    queryKey: profileQueryKeys.profile,
    queryFn: getProfile,
    staleTime: Infinity,
  });

  return profile.weight;
}

export async function getBodyStats(date: DateRequestDto) {
  const response = await appApiData<WeightStepsResponseDto>({
    method: "POST",
    endpoint: END_POINT.BODY_STATS,
    body: date,
  });

  if (response.weight === null && !isFutureDateKey(date.date)) {
    const currentWeight = await getCurrentWeight();
    await registerWeight({
      date: date.date,
      weight: currentWeight,
    });

    return {
      ...response,
      weight: currentWeight,
    };
  }

  return response;
}

export async function registerWeight({ date, weight }: { date: string; weight: number }) {
  await appApiData({
    method: "POST",
    endpoint: END_POINT.REGISTER_WEIGHT,
    body: {
      date,
      weight,
    },
  });
}

export async function registerStep({ date, steps }: { date: string; steps: number }) {
  await appApiData({
    method: "POST",
    endpoint: END_POINT.REGISTER_STEPS,
    body: {
      date,
      steps,
    },
  });
}
