export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

let authTokens: AuthTokens | null = null;

export function setAuthTokens(tokens: AuthTokens) {
  authTokens = tokens;
}

export function getAccessToken() {
  return authTokens?.accessToken ?? null;
}

export function getRefreshToken() {
  return authTokens?.refreshToken ?? null;
}

export function clearAuthTokens() {
  authTokens = null;
}
