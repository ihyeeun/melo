import type { KeyboardEvent } from "react";

import styles from "./SelectedCard.module.css";

type SelectedCardProps = {
  isSelected: boolean;
  setSelectedChange?: (isSelected: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * isSelected: boolean;
 * setSelectedChange: ()=>{};
 */
export function SelectedCard({
  isSelected,
  setSelectedChange,
  children,
  className,
}: SelectedCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!setSelectedChange || (event.key !== "Enter" && event.key !== " ")) return;

    event.preventDefault();
    setSelectedChange(!isSelected);
  };

  return (
    <article
      aria-pressed={setSelectedChange ? isSelected : undefined}
      className={[styles.card, setSelectedChange ? styles.clickable : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      data-selected={isSelected}
      onClick={setSelectedChange ? () => setSelectedChange(!isSelected) : undefined}
      onKeyDown={handleKeyDown}
      role={setSelectedChange ? "button" : undefined}
      tabIndex={setSelectedChange ? 0 : undefined}
    >
      {children}
    </article>
  );
}
