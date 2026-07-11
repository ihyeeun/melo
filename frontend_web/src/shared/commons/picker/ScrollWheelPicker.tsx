import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

import styles from "@/shared/commons/picker/ScrollWheelPicker.module.css";

export type ScrollWheelPickerColumn = {
  key: string;
  value: string;
  options: readonly string[];
  renderOption?: (value: string) => ReactNode;
  ariaLabel?: string;
};

type ScrollWheelPickerClassNames = {
  root?: string;
  column?: string;
  spacer?: string;
  item?: string;
  itemSelected?: string;
  highlight?: string;
};

type ScrollWheelPickerProps = {
  columns: ScrollWheelPickerColumn[];
  onChange: (key: string, value: string) => void;
  className?: string;
  classNames?: ScrollWheelPickerClassNames;
  columnTemplate?: string;
  height?: number | string;
  highlightHeight?: number;
  itemHeight?: number;
  scrollEndDelay?: number;
};

type ScrollWheelPickerStyle = CSSProperties & {
  "--scroll-wheel-picker-height": string;
  "--scroll-wheel-picker-highlight-height": string;
  "--scroll-wheel-picker-item-height": string;
  "--scroll-wheel-picker-column-template"?: string;
};

type ScrollWheelPickerColumnProps = {
  column: ScrollWheelPickerColumn;
  classNames?: ScrollWheelPickerClassNames;
  itemHeight: number;
  scrollEndDelay: number;
  onChange: (key: string, value: string) => void;
};

function cx(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function ScrollWheelPickerColumn({
  column,
  classNames,
  itemHeight,
  scrollEndDelay,
  onChange,
}: ScrollWheelPickerColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEndTimerRef = useRef<number | null>(null);
  const isSyncingScrollRef = useRef(false);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    const selectedIndex = column.options.indexOf(column.value);
    if (!scrollElement || selectedIndex < 0) {
      return;
    }

    isSyncingScrollRef.current = true;
    scrollElement.scrollTo({
      top: selectedIndex * itemHeight,
      behavior: "auto",
    });

    const syncTimer = window.setTimeout(() => {
      isSyncingScrollRef.current = false;
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [column.options, column.value, itemHeight]);

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  const scrollToIndex = (index: number, behavior: ScrollBehavior) => {
    scrollRef.current?.scrollTo({
      top: index * itemHeight,
      behavior,
    });
  };

  const handleScroll = () => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || isSyncingScrollRef.current) {
      return;
    }

    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = window.setTimeout(() => {
      const nextIndex = Math.min(
        Math.max(Math.round(scrollElement.scrollTop / itemHeight), 0),
        column.options.length - 1,
      );
      const nextValue = column.options[nextIndex];

      if (nextValue && nextValue !== column.value) {
        onChange(column.key, nextValue);
      }

      scrollToIndex(nextIndex, "smooth");
    }, scrollEndDelay);
  };

  const handleOptionClick = (option: string, index: number) => {
    onChange(column.key, option);
    scrollToIndex(index, "smooth");
  };

  return (
    <div
      ref={scrollRef}
      className={cx(styles.column, classNames?.column)}
      onScroll={handleScroll}
      aria-label={column.ariaLabel}
    >
      <div className={cx(styles.spacer, classNames?.spacer)} aria-hidden="true" />

      {column.options.map((option, index) => {
        const isSelected = option === column.value;

        return (
          <button
            key={option}
            type="button"
            className={cx(
              styles.item,
              classNames?.item,
              isSelected ? styles.itemSelected : undefined,
              isSelected ? classNames?.itemSelected : undefined,
            )}
            onClick={() => handleOptionClick(option, index)}
            aria-pressed={isSelected}
          >
            {column.renderOption ? column.renderOption(option) : option}
          </button>
        );
      })}

      <div className={cx(styles.spacer, classNames?.spacer)} aria-hidden="true" />
    </div>
  );
}

export function ScrollWheelPicker({
  columns,
  onChange,
  className,
  classNames,
  columnTemplate,
  height = 290,
  itemHeight = 67,
  highlightHeight = itemHeight,
  scrollEndDelay = 90,
}: ScrollWheelPickerProps) {
  const style: ScrollWheelPickerStyle = {
    "--scroll-wheel-picker-height": typeof height === "number" ? `${height}px` : height,
    "--scroll-wheel-picker-highlight-height": `${highlightHeight}px`,
    "--scroll-wheel-picker-item-height": `${itemHeight}px`,
    "--scroll-wheel-picker-column-template": columnTemplate,
  };

  return (
    <div className={cx(styles.root, classNames?.root, className)} style={style}>
      {columns.map((column) => (
        <ScrollWheelPickerColumn
          key={column.key}
          column={column}
          classNames={classNames}
          itemHeight={itemHeight}
          scrollEndDelay={scrollEndDelay}
          onChange={onChange}
        />
      ))}

      <div className={cx(styles.highlight, classNames?.highlight)} />
    </div>
  );
}
