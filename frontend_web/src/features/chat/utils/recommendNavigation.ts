import { PATH } from "@/router/path";

function parsePositiveInt(value: string | null) {
  if (value === null) return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function getRecommendResultPath(chatId: number) {
  const params = new URLSearchParams({
    chatId: String(chatId),
  });

  return `${PATH.RECOMMEND_RESULT}?${params.toString()}`;
}

export function getRecommendDetailPath(chatId: number, menuId: number) {
  const params = new URLSearchParams({
    chatId: String(chatId),
    menuId: String(menuId),
  });

  return `${PATH.RECOMMEND_DETAIL}?${params.toString()}`;
}

export function getSafeChatId(value: string | null) {
  return parsePositiveInt(value);
}

export function getSafeMenuId(value: string | null) {
  return parsePositiveInt(value);
}

export function getFeedbackResultPath(chatId: number) {
  const params = new URLSearchParams({
    chatId: String(chatId),
  });

  return `${PATH.FEEDBACK_RESULT}?${params.toString()}`;
}
