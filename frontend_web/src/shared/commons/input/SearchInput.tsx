import { type ChangeEvent, type KeyboardEvent, useEffect, useRef } from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./SearchInput.module.css";

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
  // 입력이 멈추거나 Enter를 눌렀을 때 호출된다.
  onEnter?: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  inputClassName?: string;
  maxLength?: number;
  blurOnEnter?: boolean;

  // 부모에서 조합 상태에 따라 무한 스크롤 등을 제어할 때 사용
  onCompositionChange?: (isComposing: boolean) => void;
}

export function SearchInput({
  value,
  onValueChange,
  onClear,
  onEnter,
  debounceMs = 300,
  placeholder = "검색어를 입력하세요",
  inputClassName,
  maxLength = 300,
  blurOnEnter = true,
  onCompositionChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const onEnterRef = useRef(onEnter);
  const initialValueRef = useRef(value);
  const hasValueChangedRef = useRef(false);
  const lastSubmittedValueRef = useRef<string | null>(null);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    // Strict Mode에서 effect가 재실행되어도 초기값은 자동 제출하지 않는다.
    if (value !== initialValueRef.current) {
      hasValueChangedRef.current = true;
    }
    if (!hasValueChangedRef.current || !onEnterRef.current) return;

    // SearchInputHeader처럼 조합 종료를 기다리지 않고 입력이 멈추면 검색한다.
    // 모바일 입력기는 키보드를 닫기 전까지 조합 상태를 유지할 수 있다.
    const timeoutId = window.setTimeout(() => {
      if (!onEnterRef.current || lastSubmittedValueRef.current === value) return;

      lastSubmittedValueRef.current = value;
      onEnterRef.current(value);
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [value, debounceMs]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    // 지웠다가 같은 검색어를 다시 입력하는 경우에도 새 검색을 허용한다.
    lastSubmittedValueRef.current = null;
    onValueChange(event.currentTarget.value);
  };

  const handleCompositionChange = (isComposing: boolean) => {
    isComposingRef.current = isComposing;
    onCompositionChange?.(isComposing);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key !== "Enter" ||
      isComposingRef.current ||
      event.nativeEvent.isComposing ||
      !onEnter
    ) {
      return;
    }

    event.preventDefault();

    const input = event.currentTarget;

    // trim 등 검색 정책은 부모에서 결정
    if (lastSubmittedValueRef.current !== input.value) {
      lastSubmittedValueRef.current = input.value;
      onEnter(input.value);
    }

    if (blurOnEnter) {
      input.blur();
    }
  };

  const handleClear = () => {
    lastSubmittedValueRef.current = null;
    onValueChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={styles.fieldWrap}>
      <input
        ref={inputRef}
        className={`${styles.input} body-s-medium text-primary ${inputClassName ?? ""}`}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder || "검색어 입력"}
        maxLength={maxLength}
        enterKeyHint="search"
        onChange={handleChange}
        onCompositionStart={() => handleCompositionChange(true)}
        onCompositionEnd={() => handleCompositionChange(false)}
        onKeyDown={handleKeyDown}
      />

      {value.length > 0 && (
        <button
          type="button"
          className={styles.clearButton}
          aria-label="검색어 지우기"
          onPointerDown={(event) => {
            // 지우기 버튼을 눌러도 입력창의 포커스와 모바일 키보드를 유지한다.
            if (event.button === 0) event.preventDefault();
          }}
          onClick={handleClear}
        >
          <SystemIcon name="exit" size={24} className="text-primary" />
        </button>
      )}
    </div>
  );
}
