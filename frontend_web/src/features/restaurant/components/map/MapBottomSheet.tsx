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
  // 시트 높이와 상관없이 화면 아래에 붙어서 시트 내용 위에 보인다. 시트를 다 내리면 숨긴다.
  footer?: ReactNode;
  children?: ReactNode;
};

export default function MapBottomSheet({
  snapPoint,
  onSnapPointChange,
  scrollResetKey,
  bodyRef,
  floatingAction,
  footer,
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
          data-has-footer={Boolean(footer)}
          onPointerDownCapture={dismissKeyboard}
        >
          {floatingAction && <div className={styles.floatingAction}>{floatingAction}</div>}
          <SeedBottomSheet.Handle />
          <SeedBottomSheet.Body key={scrollResetKey} ref={bodyRef} className={styles.body}>
            {children}
          </SeedBottomSheet.Body>
        </SeedBottomSheet.Content>
        {footer && snapPoint !== SNAP_POINTS[0] && <div className={styles.footer}>{footer}</div>}
      </SeedBottomSheet.Positioner>
    </SeedBottomSheet.Root>
  );
}
