import { useActivityZIndexBase } from "@seed-design/stackflow";
import type { CSSProperties } from "react";
import { useMemo } from "react";

type BottomSheetPositionerStyle = CSSProperties & {
  "--layer-index"?: string;
};

export function useBottomSheetPositionerStyle(): BottomSheetPositionerStyle {
  const activityZIndexBase = useActivityZIndexBase();

  return useMemo(
    () => ({
      ...(activityZIndexBase === undefined
        ? {}
        : {
            "--layer-index": activityZIndexBase.toString(),
          }),
    }),
    [activityZIndexBase],
  );
}
