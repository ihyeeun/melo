import { useState } from "react";

/**
 * 추천값을 보여주다가, 사용자가 한 번이라도 고치면 고친 값을 쓴다.
 * 저장된 값이 있으면(이 단계를 이미 지나간 경우) 추천값 대신 저장된 값으로 시작한다.
 */
export function useRecommendedDraft<T>(saved: T | undefined, recommended: T | undefined) {
  const [isEdited, setIsEdited] = useState(saved !== undefined);
  const [editedValue, setEditedValue] = useState(saved);

  const change = (value: T | undefined) => {
    setIsEdited(true);
    setEditedValue(value);
  };

  return [isEdited ? editedValue : recommended, change] as const;
}
