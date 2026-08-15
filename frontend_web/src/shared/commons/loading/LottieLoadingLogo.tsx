import type { HTMLAttributes } from "react";
import { useEffect, useRef } from "react";

import mellowLogoLoadingAnimationUrl from "./assets/mellow_logo_loading.json?url";
import styles from "./LottieLoadingLogo.module.css";

type LottieLoadingLogoProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  label?: string;
  speed?: number;
};

export function LottieLoadingLogo({
  className,
  label,
  speed = 1.25,
  ...props
}: LottieLoadingLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    let destroyAnimation: (() => void) | undefined;
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    void import("lottie-web/build/player/lottie_light")
      .then(({ default: lottie }) => {
        const container = containerRef.current;
        if (!isMounted || !container) return;

        const animation = lottie.loadAnimation({
          autoplay: !shouldReduceMotion,
          container,
          loop: true,
          path: mellowLogoLoadingAnimationUrl,
          renderer: "svg",
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        });

        animation.setSpeed(speed);
        const handleAnimationReady = () => {
          if (!isMounted) return;

          container.dataset.loaded = "true";

          if (shouldReduceMotion) {
            animation.goToAndStop(0, true);
          }
        };

        animation.addEventListener("DOMLoaded", handleAnimationReady);
        destroyAnimation = () => {
          animation.removeEventListener("DOMLoaded", handleAnimationReady);
          animation.destroy();
        };
      })
      .catch(() => {
        // 네트워크나 청크 로딩 실패 시 CSS 폴백을 계속 표시한다.
      });

    return () => {
      isMounted = false;
      destroyAnimation?.();
    };
  }, [speed]);

  return (
    <div
      {...props}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      ref={containerRef}
      role={label ? "status" : undefined}
    >
      <span className={styles.fallback} aria-hidden="true" />
    </div>
  );
}
