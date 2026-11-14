import { webAuthApiData } from "@/features/kakao-web-auth/api/webAuthApi";
import type { UserInfoRequest, UserInfoResponse } from "@/features/sign-up/types/signUp.type";

export function postRegisterUserInfo(payload: UserInfoRequest) {
  return webAuthApiData<UserInfoResponse>({
    endpoint: "/userAuth/registerUserInfo",
    method: "POST",
    body: payload,
  });
}
