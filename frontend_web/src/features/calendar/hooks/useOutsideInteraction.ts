import { type RefObject, useEffect, useEffectEvent } from "react";

type Options = {
  enabled: boolean;
  onInteraction: () => void;
  /** 이 선택자에 해당하는 요소 안에서 일어난 상호작용은 무시한다. */
  ignoreSelector?: string;
};

const PASSIVE_CAPTURE = { capture: true, passive: true };

/** ref 요소 바깥을 탭하거나 스크롤하면 onInteraction을 호출한다. */
export function useOutsideInteraction(
  ref: RefObject<HTMLElement | null>,
  { enabled, onInteraction, ignoreSelector }: Options,
) {
  const handleInteraction = useEffectEvent(onInteraction);

  useEffect(() => {
    if (!enabled) return;

    const handleEvent = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      if (ref.current?.contains(event.target)) return;
      if (ignoreSelector && event.target.closest(ignoreSelector)) return;

      handleInteraction();
    };

    // 캡처 단계에서 받아야 하위 요소의 stopPropagation에 막히지 않는다.
    document.addEventListener("click", handleEvent, true);
    document.addEventListener("touchmove", handleEvent, PASSIVE_CAPTURE);
    document.addEventListener("wheel", handleEvent, PASSIVE_CAPTURE);

    return () => {
      document.removeEventListener("click", handleEvent, true);
      document.removeEventListener("touchmove", handleEvent, PASSIVE_CAPTURE);
      document.removeEventListener("wheel", handleEvent, PASSIVE_CAPTURE);
    };
  }, [enabled, ignoreSelector, ref]);
}
