import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./SearchInputHeader.module.css";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  onBack?: () => void;
  onClear?: () => void;
  onEnter?: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  backButtonAriaLabel?: string;
  inputAriaLabel?: string;
  safeAreaTop?: boolean;
  className?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  enterKeyHint?: InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
  blurOnEnter?: boolean;
};

export function SearchInputHeader({
  value,
  onValueChange,
  onBack,
  onClear,
  onEnter,
  debounceMs = 300,
  placeholder = "검색어를 입력하세요",
  backButtonAriaLabel = "뒤로가기",
  inputAriaLabel = "검색어 입력",
  safeAreaTop = true,
  className,
  inputRef,
  enterKeyHint = "search",
  blurOnEnter = true,
}: Props) {
  const [isComposing, setIsComposing] = useState(false);
  const didMountRef = useRef(false);
  const onEnterRef = useRef(onEnter);
  const lastSubmittedValueRef = useRef<string | null>(null);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    if (!onEnterRef.current) return;
    if (isComposing) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (lastSubmittedValueRef.current === value) return;
      lastSubmittedValueRef.current = value;
      onEnterRef.current?.(value);
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value, debounceMs, isComposing]);

  const classes = [styles.root, safeAreaTop ? styles.safeAreaTop : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onValueChange(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (isComposing || event.nativeEvent.isComposing) return;

    event.preventDefault();

    const nextValue = event.currentTarget.value;
    if (onEnterRef.current && lastSubmittedValueRef.current !== nextValue) {
      lastSubmittedValueRef.current = nextValue;
      onEnterRef.current(nextValue);
    }

    if (blurOnEnter) {
      event.currentTarget.blur();
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }

    onValueChange("");
  };

  return (
    <header className={classes}>
      <div className={styles.navBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          disabled={!onBack}
          aria-label={backButtonAriaLabel}
        >
          <SystemIcon name="chevron-left-normal" size={24} />
        </button>

        <div className={styles.fieldWrap}>
          <input
            ref={inputRef}
            className={`${styles.input} typo-body3`}
            type="search"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
            aria-label={inputAriaLabel}
            maxLength={300}
            enterKeyHint={enterKeyHint}
          />

          {value && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              aria-label="검색어 지우기"
            >
              <SystemIcon name="circle-close" mode="image" size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
