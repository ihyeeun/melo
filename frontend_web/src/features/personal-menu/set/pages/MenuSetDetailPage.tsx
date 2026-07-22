import { useMemo, useState } from "react";

import {
  MAX_MEAL_RECORD_MENUS,
  MEAL_RECORD_MENU_LIMIT_MESSAGE,
} from "@/features/meal-record/constants/menu.constants";
import { useMenuCacheItems } from "@/features/meal-record/hooks/queries/menuCache";
import {
  formatMenuDraftKey,
  useMenuDraftMenus,
  useMenuDraftSelectedCount,
  useMenuDraftUpsert,
  useMenuDraftUpsertPreviews,
} from "@/features/meal-record/stores/menuDraft.store";
import { getMealType, getSafeDateKey } from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  MENU_SELECTION_FLOW_TARGET,
  useMenuSelectionFlowCreateFlow,
} from "@/features/menu-selection-flow/stores/menuSelectionFlow.store";
import {
  getMenuSelectionFlowMenuDetailPath,
  getMenuSelectionFlowSearchPath,
} from "@/features/menu-selection-flow/utils/menuSelectionFlowRoutes";
import { useUpsertMenuSetMutation } from "@/features/personal-menu/set/hooks/mutations/menuSet.mutation";
import { useMenuSetDetailQuery } from "@/features/personal-menu/set/hooks/queries/useMenuSetDetailQuery";
import {
  type MenuSetDraftSelectedMenu,
  type MenuSetDraftViewMenu,
  useMenuSetDraftSelectedMenus,
  useMenuSetDraftSetDraft,
  useMenuSetDraftSetId,
} from "@/features/personal-menu/set/stores/menuSetDraft.store";
import styles from "@/features/personal-menu/set/styles/MenuSetDetailPage.module.css";
import { PATH } from "@/router/path";
import { getMealSearchPath, getMenuSetDetailPath } from "@/router/pathHelpers";
import {
  type MealMenuInputMode,
  type MealServingInputMode,
  MENU_INPUT_MODE,
} from "@/shared/api/types/api.dto";
import type { UpsertMenuSetRequestDto } from "@/shared/api/types/api.request.dto";
import type { MenuSimpleResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { MealMenuCard } from "@/shared/commons/card/MealMenuCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator, LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";

type MenuSetDetailMenu = {
  menu: MenuSetDraftViewMenu;
  quantity: number;
  inputMode: MealServingInputMode;
  displayCalories: number;
};

type EditableMenusState = {
  sourceSignature: string;
  menus: MenuSetDetailMenu[];
};

function toPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function getFallbackQuantity(menu: MenuSetDraftViewMenu) {
  return toPositiveNumber(menu.weight) ?? 1;
}

function getSafeMenuSetQuantity(menu: MenuSetDraftViewMenu, quantity: number | undefined) {
  return toPositiveNumber(quantity) ?? getFallbackQuantity(menu);
}

function getSafeMenuSetInputMode(inputMode: MealMenuInputMode | undefined): MealServingInputMode {
  return inputMode === MENU_INPUT_MODE.UNIT ? "unit" : "weight";
}

function getSafeDraftInputMode(inputMode: MealServingInputMode | undefined): MealServingInputMode {
  return inputMode === "unit" ? "unit" : "weight";
}

function toMenuInputMode(inputMode: MealServingInputMode): MealMenuInputMode {
  return inputMode === "unit" ? MENU_INPUT_MODE.UNIT : MENU_INPUT_MODE.WEIGHT;
}

function scaleCaloriesByQuantity(menu: MenuSetDraftViewMenu, quantity: number) {
  const baseCalories = toPositiveNumber(menu.calories) ?? 0;
  const baseWeight = toPositiveNumber(menu.weight);

  if (baseWeight === null) {
    return baseCalories;
  }

  return baseCalories * (quantity / baseWeight);
}

function toMenuSetDetailMenus(
  menuSetDetail: {
    menu_list: MenuSimpleResponseDto[];
    menu_quantities: number[];
    menu_input_modes: MealMenuInputMode[];
  },
  menuItems: MenuSimpleResponseDto[],
): MenuSetDetailMenu[] {
  return menuItems.map((menu, index) => {
    const quantity = getSafeMenuSetQuantity(menu, menuSetDetail.menu_quantities[index]);

    return {
      menu,
      quantity,
      inputMode: getSafeMenuSetInputMode(menuSetDetail.menu_input_modes[index]),
      displayCalories: scaleCaloriesByQuantity(menu, quantity),
    };
  });
}

function toMenuSetDetailMenusFromDraft(
  selectedMenus: MenuSetDraftSelectedMenu[],
): MenuSetDetailMenu[] {
  return selectedMenus.map(({ requestMenu, viewMenu }) => {
    const quantity = getSafeMenuSetQuantity(viewMenu, requestMenu.menuQuantity);

    return {
      menu: viewMenu,
      quantity,
      inputMode: getSafeDraftInputMode(requestMenu.menuInputMode),
      displayCalories: scaleCaloriesByQuantity(viewMenu, quantity),
    };
  });
}

function buildUpsertMenuSetRequest({
  setId,
  setName,
  menus,
}: {
  setId: number;
  setName: string;
  menus: MenuSetDetailMenu[];
}): UpsertMenuSetRequestDto {
  return {
    set_id: setId,
    set_name: setName,
    menu_ids: menus.map((menu) => menu.menu.id),
    menu_quantities: menus.map((menu) => menu.quantity),
    menu_input_modes: menus.map((menu) => toMenuInputMode(menu.inputMode)),
  };
}

function buildMenuSetMenusSignature(menus: MenuSetDetailMenu[]) {
  return menus
    .map((menu) => `${menu.menu.id}:${menu.quantity}:${toMenuInputMode(menu.inputMode)}`)
    .join("|");
}

function buildMenuSetDisplaySignature(menus: MenuSetDetailMenu[]) {
  return menus
    .map(
      (menu) =>
        [
          menu.menu.id,
          menu.quantity,
          toMenuInputMode(menu.inputMode),
          menu.menu.name,
          menu.menu.brand,
          menu.menu.unit_quantity,
          menu.menu.calories,
          menu.menu.weight,
          menu.menu.unit,
          menu.menu.data_source,
        ].join(":"),
    )
    .join("|");
}

export default function MenuSetDetailPage() {
  const navigate = useNavigate();
  const createMenuSelectionFlow = useMenuSelectionFlowCreateFlow();
  const [searchParams] = useSearchParams();
  const dateKey = getSafeDateKey(searchParams.get("date"));
  const mealType = getMealType(searchParams.get("mealType"));
  const setId = Number(searchParams.get("setId"));
  const isValidSetId = Number.isInteger(setId) && setId > 0;
  const draftKey = formatMenuDraftKey(dateKey, mealType);
  const menuSetDetailPath = isValidSetId
    ? getMenuSetDetailPath(dateKey, mealType, setId)
    : getMealSearchPath(dateKey, mealType);

  const {
    data: menuSetDetail,
    isPending: isMenuSetPending,
    isError: isMenuSetError,
    refetch: refetchMenuSetDetail,
  } = useMenuSetDetailQuery(setId, { enabled: isValidSetId });
  const draftMenus = useMenuDraftMenus(dateKey, mealType);
  const selectedCount = useMenuDraftSelectedCount(dateKey, mealType);
  const upsertMenu = useMenuDraftUpsert();
  const upsertPreviews = useMenuDraftUpsertPreviews();
  const setMenuSetDraft = useMenuSetDraftSetDraft();
  const menuSetDraftSetId = useMenuSetDraftSetId();
  const menuSetDraftSelectedMenus = useMenuSetDraftSelectedMenus();
  const [editableMenusState, setEditableMenusState] = useState<EditableMenusState>({
    sourceSignature: "",
    menus: [],
  });
  const menuSetMenuIds = useMemo(
    () => menuSetDetail?.menu_list.map((menu) => menu.id) ?? [],
    [menuSetDetail?.menu_list],
  );
  const menuSetMenuItems = useMenuCacheItems(menuSetMenuIds);

  const { mutateAsync: upsertMenuSet, isPending: isUpsertMenuSetPending } =
    useUpsertMenuSetMutation();

  const serverMenus = useMemo(
    () => (menuSetDetail ? toMenuSetDetailMenus(menuSetDetail, menuSetMenuItems) : []),
    [menuSetDetail, menuSetMenuItems],
  );
  const draftSourceMenus = useMemo(
    () =>
      menuSetDraftSetId === setId
        ? toMenuSetDetailMenusFromDraft(menuSetDraftSelectedMenus)
        : null,
    [menuSetDraftSelectedMenus, menuSetDraftSetId, setId],
  );
  const sourceMenus = draftSourceMenus ?? serverMenus;
  const sourceMenusSignature = buildMenuSetDisplaySignature(sourceMenus);
  const editableMenusSourceSignature = `${draftSourceMenus ? "draft" : "server"}:${sourceMenusSignature}`;
  const editableMenus =
    editableMenusState.sourceSignature === editableMenusSourceSignature
      ? editableMenusState.menus
      : sourceMenus;

  if (editableMenusState.sourceSignature !== editableMenusSourceSignature) {
    setEditableMenusState({
      sourceSignature: editableMenusSourceSignature,
      menus: sourceMenus,
    });
  }

  const selectedMenuIdSet = useMemo(() => new Set(draftMenus.map((menu) => menu.id)), [draftMenus]);
  const totalCalories = useMemo(
    () => editableMenus.reduce((sum, menu) => sum + menu.displayCalories, 0),
    [editableMenus],
  );
  const serverMenusSignature = useMemo(
    () => buildMenuSetMenusSignature(serverMenus),
    [serverMenus],
  );
  const hasMenuSetChanges = useMemo(
    () => buildMenuSetMenusSignature(editableMenus) !== serverMenusSignature,
    [editableMenus, serverMenusSignature],
  );
  const canApplyMenuSet = (editableMenus.length > 0 || hasMenuSetChanges) && !isUpsertMenuSetPending;

  const handleBack = () => {
    navigateBack({ fallbackTo: getMealSearchPath(dateKey, mealType) });
  };

  const prepareMenuSetDraft = () => {
    if (!menuSetDetail) {
      return false;
    }

    setMenuSetDraft({
      setId,
      setName: menuSetDetail.set_name,
      selectedMenus: editableMenus.map((menuSetMenu) => ({
        requestMenu: {
          menuId: menuSetMenu.menu.id,
          menuQuantity: menuSetMenu.quantity,
          menuInputMode: menuSetMenu.inputMode,
        },
        viewMenu: menuSetMenu.menu,
      })),
    });
    return true;
  };

  const createMenuSetDetailMenuSelectionFlow = () =>
    createMenuSelectionFlow({
      menuSelectionFlowTarget: MENU_SELECTION_FLOW_TARGET.MENU_SET,
      menuSelectionCompletionReturnPath: menuSetDetailPath,
      relatedMealRecordDateKey: dateKey,
      relatedMealRecordMealType: mealType,
    });

  const handleEditMenuSet = () => {
    if (!prepareMenuSetDraft()) {
      return;
    }

    navigate(PATH.CREATE_MENU_SET);
  };

  const handleAddMenu = () => {
    if (!prepareMenuSetDraft()) {
      return;
    }

    const menuSelectionFlowId = createMenuSetDetailMenuSelectionFlow();
    navigate(getMenuSelectionFlowSearchPath(menuSelectionFlowId));
  };

  const handleMenuDetailOpen = (menuSetMenu: MenuSetDetailMenu) => {
    if (!prepareMenuSetDraft()) {
      return;
    }

    const menuSelectionFlowId = createMenuSetDetailMenuSelectionFlow();
    navigate(
      getMenuSelectionFlowMenuDetailPath({
        menuSelectionFlowId,
        menuId: menuSetMenu.menu.id,
      }),
    );
  };

  const handleRemoveMenu = (menuId: number) => {
    if (!menuSetDetail) {
      return;
    }

    setEditableMenusState((previousState) => ({
      ...previousState,
      menus: previousState.menus.filter((menu) => menu.menu.id !== menuId),
    }));
  };

  const handleApplyMenuSet = async () => {
    if (!menuSetDetail || isUpsertMenuSetPending) {
      return;
    }

    if (editableMenus.length === 0) {
      if (!hasMenuSetChanges) {
        toast.warning("담을 메뉴가 없어요");
        return;
      }

      try {
        await upsertMenuSet(
          buildUpsertMenuSetRequest({
            setId,
            setName: menuSetDetail.set_name,
            menus: editableMenus,
          }),
        );
        toast.success("세트가 수정되었어요");
        navigateBack({ fallbackTo: getMealSearchPath(dateKey, mealType) });
      } catch {
        toast.warning("세트 수정에 실패했어요", "잠시 후 다시 시도해주세요.");
      }

      return;
    }

    const nextMenuCount = editableMenus.filter(
      (menuSetMenu) => !selectedMenuIdSet.has(menuSetMenu.menu.id),
    ).length;

    if (selectedCount + nextMenuCount > MAX_MEAL_RECORD_MENUS) {
      toast.warning(MEAL_RECORD_MENU_LIMIT_MESSAGE);
      return;
    }

    if (hasMenuSetChanges) {
      try {
        await upsertMenuSet(
          buildUpsertMenuSetRequest({
            setId,
            setName: menuSetDetail.set_name,
            menus: editableMenus,
          }),
        );
      } catch {
        toast.warning("세트 수정에 실패했어요", "잠시 후 다시 시도해주세요.");
        return;
      }
    }

    editableMenus.forEach((menuSetMenu) => {
      upsertMenu({
        key: draftKey,
        id: menuSetMenu.menu.id,
        quantity: menuSetMenu.quantity,
        mode: menuSetMenu.inputMode,
      });
    });

    upsertPreviews({
      key: draftKey,
      previews: editableMenus.map((menuSetMenu) => ({
        id: menuSetMenu.menu.id,
        name: menuSetMenu.menu.name,
        brand: menuSetMenu.menu.brand,
        unit_quantity: menuSetMenu.menu.unit_quantity,
        calories: menuSetMenu.menu.calories,
        weight: menuSetMenu.menu.weight ?? undefined,
        unit: menuSetMenu.menu.unit,
        data_source: menuSetMenu.menu.data_source,
      })),
    });

    navigateBack({ fallbackTo: getMealSearchPath(dateKey, mealType) });
  };

  const renderContent = () => {
    if (!isValidSetId || isMenuSetError || !menuSetDetail) {
      if (isValidSetId && isMenuSetPending) {
        return (
          <section className={styles.stateContainer}>
            <LoadingIndicator />
          </section>
        );
      }

      return (
        <section className={styles.stateContainer}>
          <p className="typo-body2">세트를 불러오지 못했어요</p>
          {isValidSetId ? (
            <Button
              variant="text"
              interaction="normal"
              size="small"
              color="normal"
              onClick={() => {
                void refetchMenuSetDetail();
              }}
            >
              다시 시도
            </Button>
          ) : null}
        </section>
      );
    }

    return (
      <div className={styles.content}>
        <section className={styles.totalCalorieCard}>
          <span className={`${styles.totalCalorieLabel} typo-label3`}>총 칼로리</span>
          <strong className={`${styles.totalCalorieValue} typo-title1`}>
            {formatNumberWithMaxOneDecimal(totalCalories)}
            <span className={`${styles.totalCalorieUnit} typo-title3`}>kcal</span>
          </strong>
        </section>

        <section className={styles.menuSection}>
          <div className={styles.sectionHeader}>
            <h2 className="typo-title4 textNormal">담긴 메뉴</h2>
            <span className={`${styles.menuCount} typo-label4`}>{editableMenus.length}개</span>
          </div>

          {editableMenus.length > 0 ? (
            <div className={styles.menuList}>
              {editableMenus.map((menuSetMenu) => (
                <MealMenuCard
                  key={menuSetMenu.menu.id}
                  name={menuSetMenu.menu.name}
                  calories={menuSetMenu.displayCalories}
                  unit_quantity={menuSetMenu.menu.unit_quantity}
                  brand={menuSetMenu.menu.brand}
                  data_source={menuSetMenu.menu.data_source}
                  weight={menuSetMenu.menu.weight ?? undefined}
                  unit={menuSetMenu.menu.unit}
                  quantity={menuSetMenu.quantity}
                  icon="delete"
                  onClick={() => handleMenuDetailOpen(menuSetMenu)}
                  onIconClick={() => handleRemoveMenu(menuSetMenu.menu.id)}
                />
              ))}
            </div>
          ) : (
            <div className={`typo-body2 ${styles.emptyMenuState}`}>담긴 메뉴가 없어요</div>
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
      </div>
    );
  };

  return (
    <section className={styles.page}>
      <PageHeader
        title={menuSetDetail?.set_name ?? "세트"}
        onBack={handleBack}
        rightSlot={
          menuSetDetail ? (
            <Button variant="text" color="normal" onClick={handleEditMenuSet}>
              수정
            </Button>
          ) : null
        }
      />

      <main className={styles.main}>{renderContent()}</main>

      <footer className={styles.footer}>
        <Button
          onClick={handleApplyMenuSet}
          variant="filled"
          interaction={canApplyMenuSet ? "normal" : "disable"}
          size="large"
          color="primary"
          fullWidth
          disabled={!canApplyMenuSet}
        >
          담기
        </Button>
      </footer>

      {isUpsertMenuSetPending ? <LoadingOverlay label="세트를 수정하는 중입니다." /> : null}
    </section>
  );
}
