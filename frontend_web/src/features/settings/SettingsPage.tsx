import { useState } from "react";

import {
  useLogoutMutation,
  useWithdrawMutation,
} from "@/features/settings/hooks/mutations/useAccountMutation";
import { PATH } from "@/router/path";
import { resolveApiErrorToast } from "@/shared/api/apiClient";
import { isNativeApp, openNativeInAppBrowser } from "@/shared/api/bridge/nativeBridge";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import {
  CONNECT_HEALTH_APP_URL,
  NUTRITION_ANALYSIS_INFO_URL,
  TERMS_AND_PRIVACY_POLICY_URL,
} from "@/shared/config/externalLinks";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";

import styles from "./styles/SettingsPage.module.css";

function openExternalDocument(url: string) {
  if (!isNativeApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  void openNativeInAppBrowser(url).catch(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  });
}

// screen: PRF-01-002
export default function SettingsPage() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const { mutateAsync: requestLogout, isPending: isLogoutPending } = useLogoutMutation();
  const { mutateAsync: requestWithdraw, isPending: isWithdrawPending } = useWithdrawMutation();

  return (
    <div className={`${styles.page} page`}>
      <PageHeader onBack={() => navigateBack()} />

      <main className={styles.content}>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            navigate(PATH.SETTINGS_FEEDBACK);
          }}
        >
          <div className={styles.feedbackTitle}>
            <SystemIcon name="bubble" size={24} mode="image" />
            <span className={`body-l-medium`}>문의하기 / 아이디어 보내기</span>
          </div>
          <SystemIcon name="chevron-right" size={16} className={`text-secondary marginLeft`} />
        </button>

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => openExternalDocument(CONNECT_HEALTH_APP_URL)}
        >
          <span className={`body-l-medium text-primary`}>건강 앱 연동 / 해제 방법</span>
          <SystemIcon name="chevron-right" size={16} className={`text-secondary marginLeft`} />
        </button>

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => openExternalDocument(TERMS_AND_PRIVACY_POLICY_URL)}
        >
          <span className={`body-l-medium text-primary`}>서비스이용약관 / 개인정보처리방침</span>
          <SystemIcon name="chevron-right" size={16} className={`text-secondary marginLeft`} />
        </button>

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => openExternalDocument(NUTRITION_ANALYSIS_INFO_URL)}
        >
          <span className={`body-l-medium text-primary`}>영양 분석 및 산출 근거</span>
          <SystemIcon name="chevron-right" size={16} className={`text-secondary marginLeft`} />
        </button>

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => setIsLogoutModalOpen(true)}
        >
          <span className={`body-l-medium text-primary`}>로그아웃</span>
          <SystemIcon name="chevron-right" size={16} className={`text-secondary marginLeft`} />
        </button>

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => setIsWithdrawModalOpen(true)}
        >
          <span className={`body-l-medium text-primary`}>탈퇴하기</span>
          <SystemIcon name="chevron-right" size={16} className={`text-secondary marginLeft`} />
        </button>
      </main>

      {/* screen: PRF-01-002_modal-logout */}
      <ConfirmModal
        open={isLogoutModalOpen}
        onOpenChange={setIsLogoutModalOpen}
        title="로그아웃 하시겠어요?"
        cancelText="취소"
        confirmText="확인"
        // actionOrder="confirm-cancel"
        confirmDisabled={isLogoutPending}
        closeOnConfirm={false}
        // 서버 요청이 실패해도 기기의 로그인 정보를 지우고 로그인 화면으로 가므로 실패 안내가 없다
        onConfirm={requestLogout}
      />

      {/* screen: PRF-01-002_modal-withdraw */}
      <ConfirmModal
        open={isWithdrawModalOpen}
        onOpenChange={setIsWithdrawModalOpen}
        title="정말 탈퇴하시겠어요?"
        description={"기록한 데이터가 완전히 삭제되며\n복구할 수 없어요"}
        cancelText="취소"
        confirmText="확인"
        // actionOrder="confirm-cancel"
        confirmDisabled={isWithdrawPending}
        closeOnConfirm={false}
        onConfirm={async () => {
          try {
            await requestWithdraw();
          } catch (error) {
            if (isRequestAbortError(error)) throw error;
            const { title, description } = resolveApiErrorToast(error, {
              title: "탈퇴하지 못했어요",
              description: "잠시 후 다시 시도해주세요",
            });
            toast.error(title, description);
            throw error;
          }
        }}
      />

      {isLogoutPending || isWithdrawPending ? (
        <LoadingOverlay
          label={isWithdrawPending ? "탈퇴 처리 중입니다." : "로그아웃 처리 중입니다."}
        />
      ) : null}
    </div>
  );
}
