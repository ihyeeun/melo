import { useTabBarVisibilitySync } from "@/shared/api/bridge/useTabBarVisibilitySync";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";

type ChatCameraUpdateRequiredModalProps = {
  open: boolean;
  updateUrl: string | null;
  onOpenChange: (open: boolean) => void;
};

export function ChatCameraUpdateRequiredModal({
  open,
  updateUrl,
  onOpenChange,
}: ChatCameraUpdateRequiredModalProps) {
  useTabBarVisibilitySync(open);

  const handleConfirm = () => {
    if (!updateUrl) return;

    window.location.assign(updateUrl);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="앱 업데이트가 필요해요"
      description="최신 카메라 기능을 사용하려면 앱을 업데이트해주세요."
      cancelText="닫기"
      confirmText="업데이트 하기"
      confirmDisabled={updateUrl === null}
      onConfirm={handleConfirm}
    />
  );
}
