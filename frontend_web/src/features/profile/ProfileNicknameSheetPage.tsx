import { useActivity } from "@stackflow/react";
import { useEffect, useRef, useState } from "react";

import { useNickNameUpdateMutation } from "@/features/profile/hooks/mutations/useProfileMutation";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import styles from "@/features/profile/styles/ProfilePage.module.css";
import { PATH } from "@/router/path";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";

const NICKNAME_MAX_LENGTH = 15;
const NICKNAME_ALLOWED_PATTERN = /[^0-9A-Za-zㄱ-ㅎㅏ-ㅣ가-힣]/g;

// 자음·모음만으로 된 닉네임(예: ㅋㅋㅋ)은 저장하지 않는다. 입력 중에는 한글 조합 때문에 막지 않는다
const JAMO_ONLY_PATTERN = /^[ㄱ-ㅎㅏ-ㅣ]+$/;

const sanitizeNickName = (value: string) =>
  value.replace(NICKNAME_ALLOWED_PATTERN, "").slice(0, NICKNAME_MAX_LENGTH);

// screen: PRF-01-001_modal-nickname
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

  const handleUpdateNickName = () => {
    if (nickName.trim() === "") {
      setNickNameErrorMessage("");
      toast.warning("닉네임을 입력해주세요");
      return;
    }

    if (JAMO_ONLY_PATTERN.test(nickName.trim())) {
      setNickNameErrorMessage("자음이나 모음만으로는 닉네임을 만들 수 없어요");
      return;
    }

    setNickNameErrorMessage("");
    updateNickName(nickName, {
      onSuccess: () => {
        toast.success("닉네임을 수정했어요");
        closeSheet();
      },
      onError: (error) => {
        if (isRequestAbortError(error)) return;
        if (error.statusCode === 409) {
          setNickNameErrorMessage("이미 사용 중인 닉네임이에요");
        } else {
          setNickNameErrorMessage("닉네임을 수정하지 못했어요");
        }
      },
    });
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeSheet} title="닉네임 수정하기">
        <div className={styles.sheetContainer}>
          <div className={styles.fieldGroup}>
            <input
              placeholder="닉네임 입력"
              value={nickName}
              onChange={(e) => {
                setNickName(sanitizeNickName(e.target.value));
                setNickNameErrorMessage("");
              }}
              className={`${styles.input} body-s-medium`}
              aria-invalid={nickNameErrorMessage ? true : undefined}
              aria-describedby={
                nickNameErrorMessage
                  ? "profile-nickname-guide profile-nickname-error-message"
                  : "profile-nickname-guide"
              }
              ref={inputRef}
            />
            <p id="profile-nickname-guide" className="body-s-regular text-tertiary">
              한글 · 영문 · 숫자, 15자까지
            </p>
            {nickNameErrorMessage ? (
              <p
                id="profile-nickname-error-message"
                className={`${styles.nickNameErrorMessage} body-s-medium`}
                role="alert"
              >
                {nickNameErrorMessage}
              </p>
            ) : null}
          </div>

          <Button
            variant="default"
            size="m"
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
