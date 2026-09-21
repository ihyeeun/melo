import styles from "@/features/search/styles/RegisterBottomSheet.module.css";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";

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
      <main className={styles.main}>
        <h2 className={`title-s-semi text-primary`}>{title}</h2>
        <div className={styles.sheetActions}>
          <button type="button" onClick={onSelectNumberInput} className={styles.button}>
            <div className={styles.icon} aria-hidden>
              <SystemIcon name="edit" />
            </div>
            <p className={`body-m-medium text-primary`}>{numberInputLabel}</p>
          </button>

          <button type="button" onClick={onSelectCameraInput} className={styles.button}>
            <div className={styles.icon} aria-hidden>
              <SystemIcon name="camera" />
            </div>
            <p className={`body-m-medium text-primary`}>{cameraInputLabel}</p>
          </button>
        </div>
      </main>
    </BottomSheet>
  );
}
