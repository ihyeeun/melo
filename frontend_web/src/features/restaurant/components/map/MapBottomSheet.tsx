import { BottomSheet as SeedBottomSheet } from "@seed-design/react";
import { type ReactNode, useState } from "react";

import styles from "@/features/restaurant/styles/MapBottomSheet.module.css";

const SNAP_POINTS = ["36px", 0.5, 1];
const DEFAULT_SNAP_POINT = 0.5;

type MapBottomSheetProps = {
  children?: ReactNode;
};

export default function MapBottomSheet({ children }: MapBottomSheetProps) {
  const [snapPoint, setSnapPoint] = useState<number | string | null>(DEFAULT_SNAP_POINT);

  return (
    <SeedBottomSheet.Root
      open
      modal={false}
      dismissible={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snapPoint}
      setActiveSnapPoint={setSnapPoint}
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
          <SeedBottomSheet.Body className={styles.body}>{children}</SeedBottomSheet.Body>
        </SeedBottomSheet.Content>
      </SeedBottomSheet.Positioner>
    </SeedBottomSheet.Root>
  );
}
