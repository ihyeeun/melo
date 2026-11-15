import type { Activity } from "@stackflow/core";
import { useActivity } from "@stackflow/react";
import { useEffect, useRef } from "react";

// stackflowRouter는 바텀시트 화면을 직접 불러오고, 그 화면들은 공통 BottomSheet를 쓴다.
// 공통 모달·바텀시트가 stackflowRouter를 불러오면 순환 참조가 되어 핸들러 저장소만 따로 둔다

export type StackflowBackHandler = () => boolean | void;

type BackHandlerEntry = {
  handler: StackflowBackHandler;
  // 화면 안에 띄운 모달·바텀시트. 화면 핸들러보다 먼저 뒤로가기를 받는다
  isOverlay: boolean;
};

const backHandlerMap = new Map<string, BackHandlerEntry[]>();
let isRunningBackHandler = false;

// includeOverlays는 사용자가 직접 뒤로가기(Android 뒤로가기·스와이프)를 했을 때만 켠다.
// 버튼이 부르는 뒤로가기까지 모달이 받으면, 모달 [삭제] 뒤 화면 이동이 모달 닫기로 끝나 버린다
export function runStackflowBackHandlers(
  activityId: string,
  { includeOverlays }: { includeOverlays: boolean },
) {
  // 핸들러 안에서 다시 뒤로가기를 부르면(예: 바텀시트 화면의 닫기 버튼 동작) 실제로 뒤로 간다
  if (isRunningBackHandler) return false;

  const entries = backHandlerMap.get(activityId);
  if (!entries) return false;

  // 모달·바텀시트를 먼저, 같은 종류끼리는 나중에 등록한 것(위에 뜬 것)부터 처리를 맡긴다
  const orderedEntries = [
    ...entries.filter((entry) => !entry.isOverlay),
    ...(includeOverlays ? entries.filter((entry) => entry.isOverlay) : []),
  ].reverse();

  isRunningBackHandler = true;
  try {
    return orderedEntries.some((entry) => entry.handler() === true);
  } finally {
    isRunningBackHandler = false;
  }
}

function useRegisterBackHandler(
  handler: StackflowBackHandler | null | undefined,
  isOverlay: boolean,
) {
  // activity 밖에서 렌더되면 null이 온다
  const activity: Activity | null = useActivity();
  const activityId = activity?.id;
  const handlerRef = useRef(handler);
  const isEnabled = Boolean(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // 핸들러가 바뀔 때마다 다시 등록하면 순서가 바뀌므로, 켜고 끌 때만 등록한다
  useEffect(() => {
    if (!activityId || !isEnabled) return;

    const entry: BackHandlerEntry = { handler: () => handlerRef.current?.(), isOverlay };
    backHandlerMap.set(activityId, [...(backHandlerMap.get(activityId) ?? []), entry]);

    return () => {
      const remaining = (backHandlerMap.get(activityId) ?? []).filter((item) => item !== entry);
      if (remaining.length > 0) {
        backHandlerMap.set(activityId, remaining);
      } else {
        backHandlerMap.delete(activityId);
      }
    };
  }, [activityId, isEnabled, isOverlay]);
}

export function useStackflowBackHandler(handler: StackflowBackHandler | null | undefined) {
  useRegisterBackHandler(handler, false);
}

// 뒤로가기 = 닫기 (D형). 열려 있는 동안 사용자의 뒤로가기는 아래 화면으로 가지 않는다.
// 버튼이 부르는 navigateBack은 막지 않는다(runStackflowBackHandlers의 includeOverlays)
export function useStackflowOverlayBackHandler(isOpen: boolean, onClose: () => void) {
  useRegisterBackHandler(
    isOpen
      ? () => {
          onClose();
          return true;
        }
      : null,
    true,
  );
}
