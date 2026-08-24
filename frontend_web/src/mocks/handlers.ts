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
  http.post("*/menstrual-cycles", () => success({ cycles: mockMenstruationCycles })),

  // 해당 날짜의 월경 기록 조회
  http.post("*/menstrual-recorded", ({ request }) => {
    const url = new URL(request.url);
    const requestedDate = url.searchParams.get("date");

    const record = mockMenstruationRecords.find((item) => item?.date === requestedDate) ?? null;

    return success({ record });
  }),

  // 월경 회차 삭제
  http.delete("*/menstrual-cycles/:cycleId", () => success(null, "월경 회차가 삭제되었습니다.")),
];
