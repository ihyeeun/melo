import {
  getMealType,
  getSafeDateKey,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  useMenuSelectionFlowById,
} from "@/features/menu-selection-flow/stores/menuSelectionFlow.store";
import {
  getMenuSelectionFlowIdFromSearchParams,
  getMenuSelectionFlowMenuDetailPath,
  getMenuSelectionFlowSearchPath,
} from "@/features/menu-selection-flow/utils/menuSelectionFlowRoutes";
import {
  NutrientRegisterFormPage,
  type NutrientRegisterFormState,
} from "@/features/nutrient-entry/components/NutrientRegisterFormPage";
import { PATH } from "@/router/path";
import { getMealDetailPath, getPathWithMeal } from "@/router/pathHelpers";
import {
  navigateBackAndPush,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";

export default function NutrientRegisterPage() {
  const navigation = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as NutrientRegisterFormState;
  const menuSelectionFlowId = getMenuSelectionFlowIdFromSearchParams(searchParams);
  const menuSelectionFlow = useMenuSelectionFlowById(menuSelectionFlowId);
  const dateKey = getSafeDateKey(
    searchParams.get("date") ??
      locationState.dateKey ??
      menuSelectionFlow?.relatedMealRecordDateKey ??
      null,
  );
  const mealType = getMealType(
    searchParams.get("mealType") ??
      locationState.mealType ??
      menuSelectionFlow?.relatedMealRecordMealType ??
      null,
  );
  const backFallbackPath = menuSelectionFlowId
    ? getMenuSelectionFlowSearchPath(menuSelectionFlowId)
    : getPathWithMeal(PATH.MEAL_RECORD_ADD_SEARCH, dateKey, mealType);
  const shouldRemoveCameraEntryScreens = locationState.entrySource === "camera";

  const getRegisteredMenuDetailPath = (savedMenuId: number) => {
    if (menuSelectionFlowId) {
      return getMenuSelectionFlowMenuDetailPath({
        menuSelectionFlowId,
        menuId: savedMenuId,
      });
    }

    return getMealDetailPath(dateKey, mealType, savedMenuId);
  };

  return (
    <NutrientRegisterFormPage
      backFallbackPath={backFallbackPath}
      brandSearchReturnPath={PATH.NUTRIENT_ADD_REGISTER}
      dateKey={dateKey}
      initialState={locationState}
      menuSelectionFlowId={menuSelectionFlowId}
      mealType={mealType}
      onRegisteredMenu={(savedMenuId) => {
        const registeredMenuDetailPath = getRegisteredMenuDetailPath(savedMenuId);

        if (shouldRemoveCameraEntryScreens) {
          navigateBackAndPush({
            count: 2,
            animate: false,
            to: registeredMenuDetailPath,
          });
          return;
        }

        navigation(registeredMenuDetailPath, {
          replace: true,
        });
      }}
    />
  );
}
