import { appApiData } from "@/shared/api/apiClient";
import type {
  CreateMenstrualCycleRequestDto,
  CreateMenstrualRecordRequestDto,
  MenstrualRecordFieldsDto,
} from "@/shared/api/types/api.request.dto";
import {
  type MenstraulRecordReponseDto,
  type MenstrualCycleResponseDto,
  type MenstrualCyclesResponseDto,
} from "@/shared/api/types/api.response.dto";

export async function createMenstrualCycleRecorded(body: CreateMenstrualCycleRequestDto) {
  const response = await appApiData<MenstrualCycleResponseDto>({
    endpoint: "/menstrual/cycle",
    method: "POST",
    body,
  });

  return response.cycle;
}

export async function createMenstrualRecorded(body: CreateMenstrualRecordRequestDto) {
  const response = await appApiData<MenstraulRecordReponseDto>({
    endpoint: "/menstrual/record",
    method: "POST",
    body,
  });

  return response;
}

export async function getMenstruationCycles(date: string) {
  const response = await appApiData<MenstrualCyclesResponseDto>({
    endpoint: "/menstrual/cycles",
    method: "POST",
    body: { date, limit: 7 },
  });

  return response;
}

export async function getMenstrualRecorded(date: string) {
  const response = await appApiData<MenstraulRecordReponseDto>({
    endpoint: "/menstrual/record/detail",
    method: "POST",
    body: { date },
  });

  return response;
}

export async function updateMenstrualRecorded(body: MenstrualRecordFieldsDto) {
  const response = await appApiData<MenstraulRecordReponseDto>({
    endpoint: "/menstrual/record/update",
    method: "POST",
    body,
  });

  return response;
}

export async function deleteMenstrualCycle(cycle_id: number) {
  await appApiData({
    endpoint: "/menstrual/cycle/delete",
    method: "POST",
    body: { cycle_id },
  });
}
