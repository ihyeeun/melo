import { webAuthApiData } from "@/features/kakao-web-auth/api/webAuthApi";
import { END_POINT } from "@/features/onboarding/api/endpoints";
import type { UserInfoRequest, UserInfoResponse } from "@/features/onboarding/onboarding.types";

export function postRegisterUserInfo(payload: UserInfoRequest) {
  return webAuthApiData<UserInfoResponse>({
    endpoint: END_POINT.REGISTER_USER_INFO,
    method: "POST",
    body: payload,
  });
}
