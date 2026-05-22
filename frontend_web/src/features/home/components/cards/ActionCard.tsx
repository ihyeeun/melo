import type { KeyboardEvent, ReactNode } from "react";

import style from "@/features/home/styles/ActionCard.module.css";

type ActionCardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export default function ActionCard({ children, className = "", onClick }: ActionCardProps) {
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
      className={`${style.cardContainer} ${className ?? ""}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
