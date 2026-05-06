import styles from "@/features/search/styles/RegisterBottomSheet.module.css";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";

type DirectInputBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectNumberInput: () => void;
  onSelectCameraInput: () => void;
  title?: string;
  numberInputLabel?: string;
  cameraInputLabel?: string;
};

export default function DirectInputBottomSheet({
  isOpen,
  onClose,
  onSelectNumberInput,
  onSelectCameraInput,
  title = "등록 방법을 골라주세요",
  numberInputLabel = "영양정보 직접 적기",
  cameraInputLabel = "영양성분표 촬영하기",
}: DirectInputBottomSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className={styles.sheetContainer}>
        <h2 className={`${styles.sheetTitle} typo-title2`}>{title}</h2>
        <div className={styles.sheetActions}>
          <Button
            variant="text"
            interaction="normal"
            size="large"
            color="normal"
            fullWidth
            onClick={onSelectNumberInput}
          >
            <span className={`typo-title4 ${styles.sheetButtonText}`}>{numberInputLabel}</span>
          </Button>

          <div className="divider dividerMargin16" />

          <Button
            variant="text"
            interaction="normal"
            size="large"
            color="normal"
            fullWidth
            onClick={onSelectCameraInput}
          >
            <span className={`typo-title4 ${styles.sheetButtonText}`}>{cameraInputLabel}</span>
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
