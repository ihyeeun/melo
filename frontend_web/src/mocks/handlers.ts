import { http, HttpResponse } from "msw";

import {
  mockMenstruationCycles,
  mockMenstruationRecords,
} from "@/features/menstruation/mocks/menstruation.fixtures";

function success<T>(data: T, message = "요청이 성공적으로 처리되었습니다.") {
  return HttpResponse.json({ message, statusCode: 200, data });
}

export const handlers = [
  // 최근 월경 회차 조회
  http.post("*/menstrual/cycles", async ({ request }) => {
    const body = (await request.json()) as { date?: unknown; limit?: unknown };
    const date = typeof body.date === "string" ? body.date : "9999-12-31";
    const limit = typeof body.limit === "number" ? body.limit : mockMenstruationCycles.length;
    const cycles = [...mockMenstruationCycles]
      .filter((cycle) => cycle.start_date <= date)
      .sort((a, b) => b.start_date.localeCompare(a.start_date))
      .slice(0, limit);

    return success({ cycles });
  }),

  // 해당 날짜의 월경 기록 조회
  http.post("*/menstrual/record/detail", async ({ request }) => {
    const body = (await request.json()) as { date?: unknown };
    const requestedDate = typeof body.date === "string" ? body.date : null;

    const record = mockMenstruationRecords.find((item) => item?.date === requestedDate) ?? null;

    return success({ record });
  }),

  // 월경 회차 삭제
  http.post("*/menstrual/cycle/delete", () =>
    success(null, "월경 회차가 삭제되었습니다."),
  ),
];
