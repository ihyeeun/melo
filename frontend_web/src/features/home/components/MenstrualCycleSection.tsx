import { useEffect, useRef, useState } from "react";

import { MonthlyDatePickerCalendar } from "@/features/calendar/components/MonthlyDatePickerCalendar";
import ActionCard from "@/features/home/components/cards/ActionCard";
import styles from "@/features/home/styles/MenstrualCycleSection.module.css";
import {
  trackMenstrualCareDashboardTeaserClick,
  trackMenstrualCareDashboardTeaserStartDateSubmit,
} from "@/shared/analytics/menstrualCareDashboardEvents";
import { useTabBarVisibilitySync } from "@/shared/api/bridge/useTabBarVisibilitySync";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { toast } from "@/shared/commons/toast/toast";
import { formatDateKey } from "@/shared/utils/dateFormat";

export function MenstrualCycleSection() {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menstrualStartDate, setMenstrualStartDate] = useState<Date | null>(null);
  const modalOpenTimerRef = useRef<number | null>(null);

  useTabBarVisibilitySync(isTabBarHidden);

  useEffect(() => {
    return () => {
      if (modalOpenTimerRef.current !== null) {
        window.clearTimeout(modalOpenTimerRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    trackMenstrualCareDashboardTeaserClick();
    setIsTabBarHidden(true);

    if (modalOpenTimerRef.current !== null) {
      window.clearTimeout(modalOpenTimerRef.current);
    }

    modalOpenTimerRef.current = window.setTimeout(() => {
      modalOpenTimerRef.current = null;
      setIsModalOpen(true);
    }, 100);
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);

    if (!open) {
      setIsTabBarHidden(false);
    }
  };

  const handleConfirm = () => {
    if (!menstrualStartDate) return;

    const dateKey = formatDateKey(menstrualStartDate);
    trackMenstrualCareDashboardTeaserStartDateSubmit(dateKey);
    toast.success(`기능이 출시되면 가장 먼저 알려드릴게요!`);
  };

  return (
    <>
      <ActionCard className={styles.actionCard} onClick={handleClick}>
        <span className="typo-title4">내 생리 주기에 맞춘 '케어 대시보드' 보기</span>
        <SystemIcon name="chevron-right-thin" size={24} className={styles.icon} />
      </ActionCard>

      <ConfirmModal
        open={isModalOpen}
        onOpenChange={handleModalOpenChange}
        title="몸무게가 갑자기 늘어 속상하셨나요?"
        description={
          <div className={styles.modalDescription}>
            <div className={styles.textContainer}>
              <p>
                여성은 생리 주기에 따라
                <br />
                체중과 식욕이 변할 수 있어요.
                <br />
              </p>
              <br />
              <p>
                최근 생리 시작일을 선택하면,
                <br />
                맞춤 가이드를 가장 먼저 받아볼 수 있어요.
              </p>
            </div>

            <MonthlyDatePickerCalendar
              selectedDate={menstrualStartDate}
              onSelectDate={setMenstrualStartDate}
            />
          </div>
        }
        cancelText="취소"
        confirmText="확인"
        confirmDisabled={!menstrualStartDate}
        onConfirm={handleConfirm}
      />
    </>
  );
}
