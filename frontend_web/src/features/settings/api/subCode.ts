import { webAuthApiData } from "@/features/kakao-web-auth/api/webAuthApi";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";

const END_POINT = {
  REGISTER_SUB_CODE: "/profile/registerSubCode",
};

export function registerSubCode(subCode: string) {
  return webAuthApiData<ProfileResponseDto>({
    endpoint: END_POINT.REGISTER_SUB_CODE,
    method: "POST",
    body: { subCode },
  });
}
