import { BottomSheet as SeedBottomSheet } from "@seed-design/react";
import type { ReactNode, Ref } from "react";

import styles from "@/features/restaurant/styles/MapBottomSheet.module.css";
import { dismissKeyboard } from "@/features/restaurant/utils/keyboard.util";

const SNAP_POINTS = ["36px", 0.5, 1];
export const DEFAULT_SNAP_POINT = 0.5;

export type SheetSnapPoint = number | string | null;

type MapBottomSheetProps = {
  snapPoint: SheetSnapPoint;
  onSnapPointChange: (snapPoint: SheetSnapPoint) => void;
  // 값이 바뀌면 시트 내용을 다시 그려 스크롤을 맨 위로 되돌린다.
  scrollResetKey: string;
  // 시트 화면을 바꿀 때 스크롤 위치를 저장하고 되살리는 데 쓴다.
  bodyRef?: Ref<HTMLDivElement>;
  // 시트 바로 위에 붙어서, 시트를 끌면 같이 움직인다.
  floatingAction?: ReactNode;
  children?: ReactNode;
};

export default function MapBottomSheet({
  snapPoint,
  onSnapPointChange,
  scrollResetKey,
  bodyRef,
  floatingAction,
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
          onPointerDownCapture={dismissKeyboard}
        >
          {floatingAction && <div className={styles.floatingAction}>{floatingAction}</div>}
          <SeedBottomSheet.Handle />
          <SeedBottomSheet.Body key={scrollResetKey} ref={bodyRef} className={styles.body}>
            {children}
          </SeedBottomSheet.Body>
        </SeedBottomSheet.Content>
      </SeedBottomSheet.Positioner>
    </SeedBottomSheet.Root>
  );
}
