import { webAuthApiData } from "@/features/kakao-web-auth/api/webAuthApi";
import { END_POINT } from "@/features/onboarding/api/endpoints";

type AuthorizeSubCodeRequest = {
  subCode: string;
};

export function postAuthorizeSubCode(payload: AuthorizeSubCodeRequest) {
  return webAuthApiData<unknown>({
    endpoint: END_POINT.AUTHORIZE_SUB_CODE,
    method: "POST",
    body: payload,
  });
}
