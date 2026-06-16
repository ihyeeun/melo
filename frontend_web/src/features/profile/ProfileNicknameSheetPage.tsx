import { useActivity } from "@stackflow/react";
import { useEffect, useRef, useState } from "react";

import { useNickNameUpdateMutation } from "@/features/profile/hooks/mutations/useProfileMutation";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import styles from "@/features/profile/styles/ProfilePage.module.css";
import { PATH } from "@/router/path";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";

const NICKNAME_MAX_LENGTH = 15;
const NICKNAME_ALLOWED_PATTERN = /[^0-9A-Za-zㄱ-ㅎㅏ-ㅣ가-힣]/g;

const sanitizeNickName = (value: string) =>
  value.replace(NICKNAME_ALLOWED_PATTERN, "").slice(0, NICKNAME_MAX_LENGTH);

export default function ProfileNicknameSheetPage() {
  const activity = useActivity();
  const { data: profile } = useGetProfileQuery();
  const [nickName, setNickName] = useState(() => sanitizeNickName(profile?.nickname ?? ""));
  const [nickNameErrorMessage, setNickNameErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: updateNickName, isPending: isNickNamePending } = useNickNameUpdateMutation();
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep sheet input synced with async profile data.
    setNickName(sanitizeNickName(profile?.nickname ?? ""));
  }, [profile?.nickname]);

  const closeSheet = () => {
    if (!activity.isActive) return;
    navigateBack({ fallbackTo: PATH.PROFILE });
  };

  useEffect(() => {
    if (!isOpen) return;

    inputRef.current?.focus();
  }, [isOpen]);

  const handleUpdateNickName = () => {
    if (nickName.trim() === "") {
      setNickNameErrorMessage("");
      toast.warning("닉네임을 입력해주세요");
      return;
    }

    setNickNameErrorMessage("");
    updateNickName(nickName, {
      onSuccess: () => {
        toast.success("닉네임이 수정되었어요");
        closeSheet();
      },
      onError: (error) => {
        if (error.statusCode === 409) {
          setNickNameErrorMessage("이미 사용 중인 닉네임이에요");
        } else {
          setNickNameErrorMessage("닉네임 수정에 실패했어요");
        }
      },
    });
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeSheet}>
        <div className={styles.sheetContainer}>
          <section className={styles.sheetContent}>
            <p className="typo-title2">닉네임 수정하기</p>
            <div className={styles.fieldGroup}>
              <input
                placeholder="닉네임 입력"
                value={nickName}
                onChange={(e) => {
                  setNickName(sanitizeNickName(e.target.value));
                  setNickNameErrorMessage("");
                }}
                className={`${styles.input} typo-body3`}
                aria-invalid={nickNameErrorMessage ? true : undefined}
                aria-describedby={
                  nickNameErrorMessage ? "profile-nickname-error-message" : undefined
                }
                ref={inputRef}
              />
              {nickNameErrorMessage ? (
                <p
                  id="profile-nickname-error-message"
                  className={`${styles.nickNameErrorMessage} typo-body3`}
                  role="alert"
                >
                  {nickNameErrorMessage}
                </p>
              ) : null}
            </div>
          </section>

          <Button
            variant="filled"
            interaction={nickName.trim() === "" ? "disable" : "normal"}
            size="large"
            color="primary"
            fullWidth
            onClick={handleUpdateNickName}
            disabled={nickName.trim() === "" || isNickNamePending}
          >
            수정하기
          </Button>
        </div>
      </BottomSheet>

      {isNickNamePending ? <LoadingOverlay label="닉네임을 수정하는 중입니다." /> : null}
    </>
  );
}
