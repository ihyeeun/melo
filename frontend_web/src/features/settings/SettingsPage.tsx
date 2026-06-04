import { useState } from "react";

import {
  useLogoutMutation,
  useWithdrawMutation,
} from "@/features/settings/hooks/mutations/useAccountMutation";
import { PATH } from "@/router/path";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import styles from "./styles/SettingsPage.module.css";

const NUTRITION_ANALYSIS_INFO_URL = "https://third-princess-d57.notion.site/info";

function resolveErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const { mutateAsync: requestLogout, isPending: isLogoutPending } = useLogoutMutation();
  const { mutateAsync: requestWithdraw, isPending: isWithdrawPending } = useWithdrawMutation();

  return (
    <div className={styles.page}>
      <PageHeader onBack={() => navigate(-1)} title="설정" />

      <main className={styles.main}>
        <div className={styles.content}>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => navigate(PATH.SETTINGS_FEEDBACK)}
          >
            <div className={styles.labelContainer}>
              <img src="/icons/question.svg" alt="Feedback Icon" className={styles.img} />
              <span className={`${styles.menuLabel} typo-title4`}>문의하기 / 아이디어 보내기</span>
            </div>
            <SystemIcon name="chevron-right-thin" size={24} className={styles.menuChevron} />
          </button>

          {/* <button
            type="button"
            className={styles.menuItem}
            onClick={() => navigate(PATH.SETTINGS_SUB_CODE)}
          >
            <div className={styles.labelContainer}>
              <img
                src="/icons/coupon.svg"
                aria-hidden="true"
                alt="구독 코드 입력"
                className={styles.img}
              />
              <span className={`${styles.menuLabel} typo-title4`}>구독 코드 입력</span>
            </div>
            <SystemIcon name="chevron-right-thin" size={24} className={styles.menuChevron} />
          </button> */}

          <button type="button" className={styles.menuItem} onClick={() => navigate(PATH.TERMS)}>
            <span className={`${styles.menuLabel} typo-title4`}>
              서비스이용약관 / 개인정보처리방침
            </span>
            <SystemIcon name="chevron-right-thin" size={24} className={styles.menuChevron} />
          </button>

          <button
            type="button"
            className={styles.menuItem}
            onClick={() =>
              window.open(NUTRITION_ANALYSIS_INFO_URL, "_blank", "noopener,noreferrer")
            }
          >
            <span className={`${styles.menuLabel} typo-title4`}>영양 분석 및 산출 근거</span>
            <SystemIcon name="chevron-right-thin" size={24} className={styles.menuChevron} />
          </button>

          <button
            type="button"
            className={styles.menuItem}
            onClick={() => setIsLogoutModalOpen(true)}
          >
            <span className={`${styles.menuLabel} typo-title4`}>로그아웃</span>
            <SystemIcon name="chevron-right-thin" size={24} className={styles.menuChevron} />
          </button>

          <button
            type="button"
            className={styles.menuItem}
            onClick={() => setIsWithdrawModalOpen(true)}
          >
            <span className={`${styles.menuLabel} typo-title4`}>탈퇴하기</span>
            <SystemIcon name="chevron-right-thin" size={24} className={styles.menuChevron} />
          </button>
        </div>
      </main>

      <ConfirmModal
        open={isLogoutModalOpen}
        onOpenChange={setIsLogoutModalOpen}
        title="로그아웃 하시겠어요?"
        cancelText="취소"
        confirmText="확인"
        actionOrder="confirm-cancel"
        confirmDisabled={isLogoutPending}
        closeOnConfirm={false}
        onConfirm={async () => {
          try {
            await requestLogout();
          } catch (error) {
            toast.warning(resolveErrorMessage(error, "로그아웃에 실패했어요."));
            throw error;
          }
        }}
      />

      <ConfirmModal
        open={isWithdrawModalOpen}
        onOpenChange={setIsWithdrawModalOpen}
        title="정말 탈퇴하시겠어요?"
        description={"기록한 데이터가 완전히 삭제되며\n복구할 수 없어요"}
        cancelText="취소"
        confirmText="확인"
        actionOrder="confirm-cancel"
        confirmDisabled={isWithdrawPending}
        closeOnConfirm={false}
        onConfirm={async () => {
          try {
            await requestWithdraw();
          } catch (error) {
            toast.warning(resolveErrorMessage(error, "탈퇴 처리에 실패했어요."));
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
