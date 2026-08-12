import {
  getMealType,
  getSafeDateKey,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  buildMenuSelectionPathContext,
  getMenuSelectionMenuDetailPath,
  getMenuSelectionRouteContextFromSearchParams,
  getMenuSelectionSearchPath,
  type MenuSelectionPathParams,
} from "@/features/menu-selection/utils/menuSelectionRoutes";
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
  const menuSelectionRouteContext = getMenuSelectionRouteContextFromSearchParams(searchParams);
  const dateKey = getSafeDateKey(searchParams.get("date") ?? locationState.dateKey ?? null);
  const mealType = getMealType(
    searchParams.get("mealType") ?? locationState.mealType ?? null,
  );
  const menuSelectionContext: MenuSelectionPathParams | null = menuSelectionRouteContext.target
    ? buildMenuSelectionPathContext({
        dateKey,
        mealType,
        routeContext: menuSelectionRouteContext,
        target: menuSelectionRouteContext.target,
      })
    : null;
  const backFallbackPath = menuSelectionContext?.target
    ? getMenuSelectionSearchPath(menuSelectionContext)
    : getPathWithMeal(PATH.MEAL_RECORD_ADD_SEARCH, dateKey, mealType);
  const shouldRemoveCameraEntryScreens = locationState.entrySource === "camera";

  const getRegisteredMenuDetailPath = (savedMenuId: number) => {
    if (menuSelectionContext?.target) {
      return getMenuSelectionMenuDetailPath({
        ...menuSelectionContext,
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
      menuSelectionContext={menuSelectionContext}
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
