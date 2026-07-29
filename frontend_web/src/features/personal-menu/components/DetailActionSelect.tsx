import { Select } from "@base-ui/react";
import { useState } from "react";

import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

import styles from "./DetailActionSelect.module.css";

type DetailActionValue = "edit" | "delete";

type DetailActionSelectProps = {
  disabled?: boolean;
  label?: string;
  onDelete: () => void;
  onEdit: () => void;
};

const DETAIL_ACTION_OPTIONS: Array<{
  label: string;
  value: DetailActionValue;
  variant?: "danger";
}> = [
  { label: "수정", value: "edit" },
  { label: "삭제", value: "delete", variant: "danger" },
];

export function DetailActionSelect({
  disabled = false,
  onDelete,
  onEdit,
}: DetailActionSelectProps) {
  const [value, setValue] = useState<DetailActionValue | null>(null);

  const handleValueChange = (nextValue: DetailActionValue | null) => {
    setValue(null);

    if (nextValue === "edit") {
      onEdit();
      return;
    }

    if (nextValue === "delete") {
      onDelete();
    }
  };

  return (
    <Select.Root<DetailActionValue>
      value={value}
      onValueChange={handleValueChange}
      disabled={disabled}
      modal={false}
    >
      <Select.Trigger className={`${styles.trigger} typo-label3`} aria-label={`메뉴`}>
        <Select.Icon className={styles.icon} aria-hidden>
          <SystemIcon name="kebab" size={18} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner className={styles.positioner} side="bottom" align="end">
          <Select.Popup className={styles.popup}>
            <Select.List className={styles.list}>
              {DETAIL_ACTION_OPTIONS.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className={`${styles.item} ${
                    option.variant === "danger" ? styles.dangerItem : ""
                  } typo-body2`}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
