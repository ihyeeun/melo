import { useCallback, useEffect } from "react";

import {
  MENU_SELECTION_FLOW_TARGET,
  useMenuSelectionFlowCreateFlow,
} from "@/features/menu-selection-flow/stores/menuSelectionFlow.store";
import {
  getMenuSelectionFlowMenuDetailPath,
  getMenuSelectionFlowSearchPath,
  isDraftEditingMenuSelectionNavigationPath,
} from "@/features/menu-selection-flow/utils/menuSelectionFlowRoutes";
import { useUpsertMenuSetMutation } from "@/features/personal-menu/set/hooks/mutations/menuSet.mutation";
import {
  useMenuSetDraftBuildUpsertRequest,
  useMenuSetDraftClearDraft,
  useMenuSetDraftName,
  useMenuSetDraftRemoveSelectedMenu,
  useMenuSetDraftSelectedMenus,
  useMenuSetDraftSetId,
  useMenuSetDraftSetName,
} from "@/features/personal-menu/set/stores/menuSetDraft.store";
import styles from "@/features/personal-menu/set/styles/CreateMenuSetPage.module.css";
import { PATH } from "@/router/path";
import { Button } from "@/shared/commons/button/Button";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useStackflowBackHandler,
} from "@/shared/navigation/stackflowNavigation";

const MENU_SET_NAME_MAX_LENGTH = 20;

function limitMenuSetName(value: string) {
  return Array.from(value).slice(0, MENU_SET_NAME_MAX_LENGTH).join("");
}

export default function CreateMenuSetPage() {
  const navigate = useNavigate();
  const createMenuSelectionFlow = useMenuSelectionFlowCreateFlow();
  const setId = useMenuSetDraftSetId();
  const setName = useMenuSetDraftName();
  const selectedMenus = useMenuSetDraftSelectedMenus();
  const setSetName = useMenuSetDraftSetName();
  const removeSelectedMenu = useMenuSetDraftRemoveSelectedMenu();
  const clearDraft = useMenuSetDraftClearDraft();
  const buildUpsertRequest = useMenuSetDraftBuildUpsertRequest();
  const isEditMode = typeof setId === "number";
  const { mutate: upsertMenuSet, isPending: isUpsertMenuSetPending } = useUpsertMenuSetMutation({
    onSuccess: () => {
      clearDraft();
      toast.success(isEditMode ? "세트가 수정되었어요" : "세트가 저장되었어요");
      navigateBack({
        fallbackTo: PATH.MEAL_RECORD_ADD_SEARCH,
        skipBackHandler: true,
      });
    },
    onError: () => {
      toast.warning("세트 저장에 실패했어요", "잠시 후 다시 시도해주세요.");
    },
  });
  const canSubmit = setName.trim().length > 0 && selectedMenus.length > 0;

  const handleBackGuard = useCallback(() => {
    clearDraft();
    return false;
  }, [clearDraft]);

  useStackflowBackHandler(handleBackGuard);

  useEffect(() => {
    return () => {
      if (
        isDraftEditingMenuSelectionNavigationPath({
          currentPath: window.location.href,
          draftPagePath: PATH.CREATE_MENU_SET,
        })
      ) {
        return;
      }

      clearDraft();
    };
  }, [clearDraft]);

  const createMenuSetMenuSelectionFlow = () =>
    createMenuSelectionFlow({
      menuSelectionFlowTarget: MENU_SELECTION_FLOW_TARGET.MENU_SET,
      menuSelectionCompletionReturnPath: PATH.CREATE_MENU_SET,
    });

  const handleAddMenu = () => {
    const menuSelectionFlowId = createMenuSetMenuSelectionFlow();
    navigate(getMenuSelectionFlowSearchPath(menuSelectionFlowId));
  };

  const handleMenuDetailOpen = (menuId: number) => {
    const menuSelectionFlowId = createMenuSetMenuSelectionFlow();
    navigate(
      getMenuSelectionFlowMenuDetailPath({
        menuSelectionFlowId,
        menuId,
      }),
    );
  };

  const handleBack = () => {
    clearDraft();
    navigateBack({
      fallbackTo: PATH.MEAL_RECORD_ADD_SEARCH,
      skipBackHandler: true,
    });
  };

  const handleSubmit = () => {
    if (isUpsertMenuSetPending) {
      return;
    }

    if (!canSubmit) {
      toast.warning(setName.trim().length === 0 ? "세트명을 입력해주세요" : "음식을 추가해주세요");
      return;
    }

    const request = buildUpsertRequest();
    upsertMenuSet(request);
  };

  return (
    <section className={styles.page}>
      <PageHeader title={isEditMode ? "세트 수정" : "새 세트 만들기"} onBack={handleBack} />

      <main className={styles.main}>
        <section className={styles.fieldSection}>
          <label className={`typo-label2 ${styles.fieldLabel}`} htmlFor="set-name">
            세트명
          </label>
          <input
            id="set-name"
            className={`typo-body2 ${styles.setNameInput}`}
            value={setName}
            onChange={(event) => setSetName(limitMenuSetName(event.target.value))}
            placeholder="세트명을 입력해주세요"
            maxLength={MENU_SET_NAME_MAX_LENGTH}
          />
          <span className={`${styles.marginLeftAuto} typo-caption4 textAssistive`}>
            최대 20자 이내
          </span>
        </section>

        <section className={styles.menuSection}>
          <div className={styles.labelRow}>
            <h2 className={`typo-label2 ${styles.sectionTitle}`}>음식</h2>
            <span className={`typo-label4 ${styles.menuCount}`}>{selectedMenus.length}개</span>
          </div>

          {selectedMenus.length > 0 ? (
            <div className={styles.menuList}>
              {selectedMenus.map(({ requestMenu, viewMenu }) => (
                <MealMenuCard
                  key={requestMenu.menuId}
                  name={viewMenu.name}
                  calories={viewMenu.calories}
                  unit_quantity={viewMenu.unit_quantity}
                  brand={viewMenu.brand}
                  data_source={viewMenu.data_source}
                  weight={viewMenu.weight ?? undefined}
                  unit={viewMenu.unit}
                  quantity={requestMenu.menuQuantity}
                  icon="delete"
                  onClick={() => handleMenuDetailOpen(requestMenu.menuId)}
                  onIconClick={() => removeSelectedMenu(requestMenu.menuId)}
                />
              ))}
            </div>
          ) : (
            <div className={`typo-body2 ${styles.emptyMenuState}`}>
              세트에 담을 음식을 추가해주세요
            </div>
          )}

          <Button
            className={styles.addButton}
            variant="outlined"
            color="normal"
            fullWidth
            onClick={handleAddMenu}
          >
            <SystemIcon name="plus" size={16} />
            음식 추가
          </Button>
        </section>
      </main>

      <footer className={styles.footer}>
        <Button
          onClick={handleSubmit}
          variant="filled"
          interaction={canSubmit && !isUpsertMenuSetPending ? "normal" : "disable"}
          size="large"
          color="primary"
          fullWidth
          disabled={!canSubmit || isUpsertMenuSetPending}
        >
          {isUpsertMenuSetPending ? "저장 중" : isEditMode ? "수정하기" : "저장하기"}
        </Button>
      </footer>
    </section>
  );
}
