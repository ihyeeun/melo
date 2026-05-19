import "./BottomSheet.css";

import { useMemo } from "react";
import { Sheet } from "react-modal-sheet";

import { useTabBarVisibilitySync } from "@/shared/api/bridge/useTabBarVisibilitySync";

type SnapBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints: number[];
  initialSnap?: number;
  disableScrollLocking?: boolean;
};

const DEFAULT_SNAP_POINTS = [0, 0.5, 1] as const;

function normalizeSnapPoints(points: number[]): number[] {
  if (points.length === 0) return [...DEFAULT_SNAP_POINTS];

  const normalized = [...points];

  if (normalized[0] !== 0) normalized.unshift(0);
  if (normalized.at(-1) !== 1) normalized.push(1);

  return normalized;
}

function resolveInitialSnap(initialSnap: number | undefined, points: number[]): number {
  if (initialSnap === undefined) {
    const firstOpenIndex = points.findIndex((point) => point > 0);
    return firstOpenIndex >= 0 ? firstOpenIndex : points.length - 1;
  }

  if (initialSnap < 0) return 0;
  if (initialSnap >= points.length) return points.length - 1;

  return initialSnap;
}

export default function SnapBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints,
  initialSnap,
  disableScrollLocking = false,
}: SnapBottomSheetProps) {
  const normalizedSnapPoints = useMemo(() => normalizeSnapPoints(snapPoints), [snapPoints]);
  const safeInitialSnap = useMemo(
    () => resolveInitialSnap(initialSnap, normalizedSnapPoints),
    [initialSnap, normalizedSnapPoints],
  );

  useTabBarVisibilitySync(isOpen);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={normalizedSnapPoints}
      initialSnap={safeInitialSnap}
      disableScrollLocking={disableScrollLocking}
    >
      <Sheet.Container
        style={{
          boxShadow: "none",
        }}
      >
        <Sheet.Header className="melo-bottom-sheet-header">
          <div className="melo-bottom-sheet-handle" aria-hidden="true" />
        </Sheet.Header>
        <Sheet.Content>
          <div>
            {title ? <div className="typo-title2">{title}</div> : null}
            {children}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={onClose}
        transition={{ duration: 0.2 }}
        style={{
          backgroundColor: "var(--dimmer-dimmer)",
          transform: "none",
        }}
      />
    </Sheet>
  );
}
