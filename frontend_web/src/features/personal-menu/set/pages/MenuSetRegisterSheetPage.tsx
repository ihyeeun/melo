import { useActivity } from "@stackflow/react";
import { useState } from "react";

import { useUpsertMenuSetMutation } from "@/features/personal-menu/set/hooks/mutations/menuSet.mutation";
import styles from "@/features/personal-menu/set/styles/MenuSetRegisterSheetPage.module.css";
import { PATH } from "@/router/path";
import type { MealMenuInputMode } from "@/shared/api/types/api.dto";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useLocation,
} from "@/shared/navigation/stackflowNavigation";

const MENU_SET_NAME_MAX_LENGTH = 20;

export type MenuSetRegisterSheetMenu = {
  id: number;
  quantity: number;
  inputMode: MealMenuInputMode;
};

export type MenuSetRegisterSheetLocationState = {
  fallbackPath?: string;
  menus?: MenuSetRegisterSheetMenu[];
};

function limitMenuSetName(value: string) {
  return Array.from(value).slice(0, MENU_SET_NAME_MAX_LENGTH).join("");
}

function isValidMenu(menu: unknown): menu is MenuSetRegisterSheetMenu {
  if (!menu || typeof menu !== "object") {
    return false;
  }

  const candidate = menu as Partial<MenuSetRegisterSheetMenu>;

  return (
    typeof candidate.id === "number" &&
    Number.isInteger(candidate.id) &&
    candidate.id > 0 &&
    typeof candidate.quantity === "number" &&
    Number.isFinite(candidate.quantity) &&
    candidate.quantity > 0 &&
    (candidate.inputMode === 0 || candidate.inputMode === 1)
  );
}

function getSafeMenus(state: MenuSetRegisterSheetLocationState | null) {
  if (!Array.isArray(state?.menus)) {
    return [];
  }

  return state.menus.filter(isValidMenu);
}

export default function MenuSetRegisterSheetPage() {
  const activity = useActivity();
  const location = useLocation();
  const locationState = location.state as MenuSetRegisterSheetLocationState | null;
  const menus = getSafeMenus(locationState);
  const [setName, setSetName] = useState("");
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";
  const fallbackPath = locationState?.fallbackPath ?? PATH.MEAL_RECORD;
  const canSubmit = setName.trim().length > 0 && menus.length > 0;

  const closeSheet = () => {
    if (!activity.isActive) return;
    navigateBack({ fallbackTo: fallbackPath });
  };

  const { mutate: upsertMenuSet, isPending: isUpsertMenuSetPending } = useUpsertMenuSetMutation({
    onSuccess: () => {
      toast.success("세트가 등록되었어요");
      closeSheet();
    },
    onError: () => {
      toast.warning("세트 등록에 실패했어요", "잠시 후 다시 시도해주세요.");
    },
  });

  const handleSubmit = () => {
    if (isUpsertMenuSetPending) {
      return;
    }

    const trimmedName = setName.trim();
    if (trimmedName.length === 0) {
      toast.warning("세트명을 입력해주세요");
      return;
    }

    if (menus.length === 0) {
      toast.warning("세트로 등록할 메뉴가 없어요");
      return;
    }

    upsertMenuSet({
      set_name: trimmedName,
      menu_ids: menus.map((menu) => menu.id),
      menu_quantities: menus.map((menu) => menu.quantity),
      menu_input_modes: menus.map((menu) => menu.inputMode),
    });
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeSheet} disableContentDrag>
        <div className={styles.sheetContainer}>
          <section className={styles.sheetContent}>
            <h2 className={`${styles.title} typo-title2`}>어떤 이름으로 등록할까요?</h2>
            <div className={styles.fieldGroup}>
              <input
                className={`${styles.input} typo-body2`}
                value={setName}
                onChange={(event) => setSetName(limitMenuSetName(event.target.value))}
                placeholder="세트명 입력"
                maxLength={MENU_SET_NAME_MAX_LENGTH}
                aria-label="세트명 입력"
              />
              <span className={`${styles.lengthHint} typo-caption4 textAssistive`}>
                20자 이내
              </span>
            </div>
          </section>

          <Button
            variant="filled"
            interaction={canSubmit && !isUpsertMenuSetPending ? "normal" : "disable"}
            size="large"
            color="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={!canSubmit || isUpsertMenuSetPending}
          >
            등록하기
          </Button>
        </div>
      </BottomSheet>

      {isUpsertMenuSetPending ? <LoadingOverlay label="세트를 등록하는 중입니다." /> : null}
    </>
  );
}
