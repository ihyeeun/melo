import styles from "@/features/profile/styles/BirthYearSheet.module.css";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { ScrollWheelPicker } from "@/shared/commons/picker/ScrollWheelPicker";
import { getBirthYearRange } from "@/shared/commons/picker/yearOptions";

const BIRTH_YEAR_RANGE = getBirthYearRange();
const BIRTH_YEAR_OPTIONS = Array.from(
  { length: BIRTH_YEAR_RANGE.max - BIRTH_YEAR_RANGE.min + 1 },
  (_, index) => String(BIRTH_YEAR_RANGE.min + index),
);

type BirthYearSheetProps = {
  isOpen: boolean;
  value: number;
  onChange: (year: number) => void;
  onConfirm: () => void;
  onClose: () => void;
};

// 회원가입(ONB-01-003_modal-birth)과 목표 재설정(PRF-01-003_modal-birth)이 같이 쓰는 출생 연도 선택 시트
export function BirthYearSheet({
  isOpen,
  value,
  onChange,
  onConfirm,
  onClose,
}: BirthYearSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="출생 연도"
      bodyClassName={styles.sheetBody}
      disableContentDrag
    >
      <div className={styles.sheetContent}>
        <ScrollWheelPicker
          height={260}
          itemHeight={52}
          classNames={{
            item: `title-l-semi ${styles.pickerItem}`,
            itemSelected: styles.pickerItemSelected,
            highlight: styles.pickerHighlight,
          }}
          columns={[
            {
              key: "birthYear",
              value: String(value),
              options: BIRTH_YEAR_OPTIONS,
              renderOption: (year) => `${year} 년`,
              ariaLabel: "출생 연도 선택",
            },
          ]}
          onChange={(_key, year) => onChange(Number(year))}
        />

        <Button size="m" fullWidth onClick={onConfirm}>
          확인
        </Button>
      </div>
    </BottomSheet>
  );
}
