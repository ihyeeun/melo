import { http, HttpResponse } from "msw";

function success<T>(data: T, message = "요청이 성공적으로 처리되었습니다.") {
  return HttpResponse.json({ message, statusCode: 200, data });
}

export const handlers = [
  // 월경 회차 삭제
  http.post("*/menstrual/cycle/delete", () => success(null, "월경 회차가 삭제되었습니다.")),
];
