import styles from "@/features/camera/styles/CameraPage.module.css";

type CameraLoadingProps = {
  description: string;
  previewSrc?: string | null;
};

export function CameraLoading({ description, previewSrc = null }: CameraLoadingProps) {
  return (
    <main className={styles.mainLoading}>
      <div className={styles.loadingContent}>
        {previewSrc ? (
          <div className={styles.previewFrame}>
            <img src={previewSrc} alt="촬영한 사진 미리보기" className={styles.previewImage} />
            <div className={styles.scanOverlay} aria-hidden />
            <div className={styles.scanLine} aria-hidden />
          </div>
        ) : null}
        <p className="typo-body2">
          {description}
          <br />
          조금만 기다려주세요
        </p>
      </div>
    </main>
  );
}
