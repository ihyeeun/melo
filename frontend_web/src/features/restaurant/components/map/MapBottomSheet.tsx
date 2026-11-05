import { BottomSheet as SeedBottomSheet } from "@seed-design/react";
import type { ReactNode } from "react";

import styles from "@/features/restaurant/styles/MapBottomSheet.module.css";

const SNAP_POINTS = ["36px", 0.5, 1];
export const DEFAULT_SNAP_POINT = 0.5;

export type SheetSnapPoint = number | string | null;

type MapBottomSheetProps = {
  snapPoint: SheetSnapPoint;
  onSnapPointChange: (snapPoint: SheetSnapPoint) => void;
  // 값이 바뀌면 시트 내용을 다시 그려 스크롤을 맨 위로 되돌린다.
  scrollResetKey: string;
  children?: ReactNode;
};

export default function MapBottomSheet({
  snapPoint,
  onSnapPointChange,
  scrollResetKey,
  children,
}: MapBottomSheetProps) {
  return (
    <SeedBottomSheet.Root
      open
      modal={false}
      dismissible={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snapPoint}
      setActiveSnapPoint={onSnapPointChange}
      autoFocus={false}
      repositionInputs={false}
    >
      <SeedBottomSheet.Positioner className={styles.positioner}>
        <SeedBottomSheet.Content
          className={styles.content}
          aria-label="지도 시트"
          aria-describedby={undefined}
          data-expanded={snapPoint === 1}
        >
          <SeedBottomSheet.Handle />
          <SeedBottomSheet.Body key={scrollResetKey} className={styles.body}>
            {children}
          </SeedBottomSheet.Body>
        </SeedBottomSheet.Content>
      </SeedBottomSheet.Positioner>
    </SeedBottomSheet.Root>
  );
}
