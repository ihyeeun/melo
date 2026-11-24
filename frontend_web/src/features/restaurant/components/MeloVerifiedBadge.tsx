import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

// 멜로 등록 식당(메뉴 영양 정보가 있는 식당) 표시 — 글자 없는 주황 체크 뱃지
export function MeloVerifiedBadge({ size = 18 }: { size?: number }) {
  return (
    <SystemIcon
      name="melo-verified"
      mode="image"
      size={size}
      aria-hidden={false}
      aria-label="멜로 등록"
      role="img"
    />
  );
}
