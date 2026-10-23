import { Select } from "@base-ui/react";
import { useState } from "react";

import styles from "@/features/personal-menu/folder/styles/FolderDetailPage.module.css";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

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
      <Select.Trigger className={`${styles.trigger}`} aria-label={`메뉴`}>
        <SystemIcon name="more-horiz" size={24} className="text-secondary" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="end" sideOffset={14}>
          <Select.Popup className={styles.popup}>
            <Select.List>
              {DETAIL_ACTION_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value} className={`${styles.item}`}>
                  <Select.ItemText
                    className={`body-s-medium ${option.value === "delete" ? styles.danger : "text-secondary"}`}
                  >
                    {option.label}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
