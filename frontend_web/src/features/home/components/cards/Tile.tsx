import type { KeyboardEvent, ReactNode } from "react";

import styles from "@/features/home/styles/card.module.css";

type TileProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export default function Tile({ children, className = "", onClick }: TileProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || event.currentTarget !== event.target) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`${styles.root} ${className ?? ""}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
