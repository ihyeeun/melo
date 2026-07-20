import { useCallback, useEffect } from "react";

import { useUpsertFolderMutation } from "@/features/personal-menu/folder/hooks/mutations/folder.mutation";
import {
  useFolderDraftBuildUpsertRequest,
  useFolderDraftClearDraft,
  useFolderDraftName,
  useFolderDraftRemoveSelectedMenu,
  useFolderDraftSelectedMenus,
  useFolderDraftSetName,
} from "@/features/personal-menu/folder/stores/folderDraft.store";
import styles from "@/features/personal-menu/folder/styles/CreateFolderPage.module.css";
import { PATH } from "@/router/path";
import { getFolderMenuDetailPath, getFolderMenuSearchPath } from "@/router/pathHelpers";
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

function isFolderCreationFlowPath(path: string) {
  const url = new URL(path, window.location.origin);

  if (url.pathname === PATH.CREATE_FOLDER) {
    return true;
  }

  if (url.searchParams.get("mode") !== "folder") {
    return false;
  }

  return url.pathname === PATH.MEAL_RECORD_ADD_SEARCH || url.pathname === PATH.MEAL_DETAIL;
}

export default function CreateFolderPage() {
  const navigate = useNavigate();
  const folderName = useFolderDraftName();
  const selectedMenus = useFolderDraftSelectedMenus();
  const setFolderName = useFolderDraftSetName();
  const removeSelectedMenu = useFolderDraftRemoveSelectedMenu();
  const clearDraft = useFolderDraftClearDraft();
  const buildUpsertRequest = useFolderDraftBuildUpsertRequest();
  const { mutate: upsertFolder, isPending: isUpsertFolderPending } = useUpsertFolderMutation({
    onSuccess: () => {
      clearDraft();
      toast.success("폴더가 저장되었어요");
      navigateBack({ fallbackTo: PATH.MEAL_RECORD_ADD_SEARCH, skipBackHandler: true });
    },
    onError: () => {
      toast.warning("폴더 저장에 실패했어요", "잠시 후 다시 시도해주세요.");
    },
  });
  const canSubmit = folderName.trim().length > 0 && selectedMenus.length > 0;

  const handleBackGuard = useCallback(() => {
    clearDraft();
    return false;
  }, [clearDraft]);

  useStackflowBackHandler(handleBackGuard);

  useEffect(() => {
    return () => {
      if (isFolderCreationFlowPath(window.location.href)) {
        return;
      }

      clearDraft();
    };
  }, [clearDraft]);

  const handleAddMenu = () => {
    navigate(getFolderMenuSearchPath());
  };

  const handleMenuDetailOpen = (menuId: number) => {
    navigate(getFolderMenuDetailPath(menuId));
  };

  const handleBack = () => {
    clearDraft();
    navigateBack({ fallbackTo: PATH.MEAL_RECORD_ADD_SEARCH, skipBackHandler: true });
  };

  const handleSubmit = () => {
    if (isUpsertFolderPending) {
      return;
    }

    if (!canSubmit) {
      toast.warning(
        folderName.trim().length === 0 ? "폴더 이름을 입력해주세요" : "음식을 추가해주세요",
      );
      return;
    }

    const request = buildUpsertRequest();
    upsertFolder(request);
  };

  return (
    <section className={styles.page}>
      <PageHeader title="새 폴더 만들기" onBack={handleBack} />

      <main className={styles.main}>
        <section className={styles.fieldSection}>
          <label className={`typo-label2 ${styles.fieldLabel}`} htmlFor="folder-name">
            폴더 이름
          </label>
          <input
            id="folder-name"
            className={`typo-body2 ${styles.folderNameInput}`}
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="폴더 이름을 입력해주세요"
            maxLength={20}
          />
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
              폴더에 담을 음식을 추가해주세요
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
          interaction={canSubmit && !isUpsertFolderPending ? "normal" : "disable"}
          size="large"
          color="primary"
          fullWidth
          disabled={!canSubmit || isUpsertFolderPending}
        >
          {isUpsertFolderPending ? "저장 중" : "저장하기"}
        </Button>
      </footer>
    </section>
  );
}
