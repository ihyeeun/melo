import type { KeyboardEvent } from "react";

import styles from "./SelectedCard.module.css";

type SelectedCardProps = {
  isSelected: boolean;
  setSelectedChange?: (isSelected: boolean) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
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
  disabled = false,
}: SelectedCardProps) {
  const isInteractive = setSelectedChange !== undefined;
  const isEnabled = isInteractive && !disabled;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isEnabled || (event.key !== "Enter" && event.key !== " ")) return;

    event.preventDefault();
    setSelectedChange(!isSelected);
  };

  return (
    <article
      aria-disabled={isInteractive ? disabled : undefined}
      aria-pressed={isInteractive ? isSelected : undefined}
      className={[styles.card, isEnabled ? styles.clickable : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      data-disabled={isInteractive ? disabled : undefined}
      data-selected={isSelected}
      onClick={isEnabled ? () => setSelectedChange(!isSelected) : undefined}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isEnabled ? 0 : isInteractive ? -1 : undefined}
    >
      {children}
    </article>
  );
}
