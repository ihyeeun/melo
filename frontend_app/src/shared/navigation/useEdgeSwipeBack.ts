import { useMemo } from "react";
import { PanResponder } from "react-native";

const DEFAULT_EDGE_WIDTH = 32;
const DEFAULT_START_DISTANCE = 12;
const DEFAULT_TRIGGER_DISTANCE = 64;
const DEFAULT_VERTICAL_CANCEL_DISTANCE = 48;

type UseEdgeSwipeBackOptions = {
  enabled: boolean;
  onBack: () => void;
  edgeWidth?: number;
  startDistance?: number;
  triggerDistance?: number;
  verticalCancelDistance?: number;
};

export function useEdgeSwipeBack({
  enabled,
  onBack,
  edgeWidth = DEFAULT_EDGE_WIDTH,
  startDistance = DEFAULT_START_DISTANCE,
  triggerDistance = DEFAULT_TRIGGER_DISTANCE,
  verticalCancelDistance = DEFAULT_VERTICAL_CANCEL_DISTANCE,
}: UseEdgeSwipeBackOptions) {
  const panHandlers = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (event, gestureState) => {
          if (!enabled) return false;
          if (event.nativeEvent.pageX > edgeWidth) return false;
          if (gestureState.dx < startDistance) return false;

          return (
            Math.abs(gestureState.dy) < verticalCancelDistance &&
            gestureState.dx > Math.abs(gestureState.dy)
          );
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx >= triggerDistance) {
            onBack();
          }
        },
      }).panHandlers,
    [edgeWidth, enabled, onBack, startDistance, triggerDistance, verticalCancelDistance],
  );

  return {
    edgeWidth,
    panHandlers,
  };
}
