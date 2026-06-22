/* eslint-disable react-refresh/only-export-components */
import type { Activity, Stack } from "@stackflow/core";
import { id as createStackflowActivityId } from "@stackflow/core";
import { devtoolsPlugin } from "@stackflow/plugin-devtools";
import { historySyncPlugin } from "@stackflow/plugin-history-sync";
import { stackDepthChangePlugin } from "@stackflow/plugin-stack-depth-change";
import type { StackflowReactPlugin } from "@stackflow/react";
import { stackflow, useActivity } from "@stackflow/react";
import {
  type ComponentType,
  type CSSProperties,
  lazy,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  Suspense,
  type TransitionEvent as ReactTransitionEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import HomeStepsLogSheet from "@/features/home/components/sheets/StepsLogBottomSheetActivity";
import HomeWeightLogSheet from "@/features/home/components/sheets/WeightLogBottomSheetActivity";
import ProfileNicknameSheetPage from "@/features/profile/ProfileNicknameSheetPage";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { isNativeApp, requestAppBack } from "@/shared/api/bridge/nativeBridge";
import { LoadingScreen } from "@/shared/commons/loading/Loading";
import {
  FEATURE_GUARD,
  type FeatureGuardTarget,
  useIsFeatureBlocked,
} from "@/shared/guards/featureGuard";

import { setStackflowNavigateBackHandler } from "./stackflowNavigationController";
import styles from "./StackflowRuntime.module.css";

type ActivityParams = Record<string, string | undefined>;
type RoutePath = string | string[];

export type To =
  | string
  | {
      pathname?: string;
      search?: string;
      hash?: string;
    };

export type NavigateOptions = {
  animate?: boolean;
  replace?: boolean;
  state?: unknown;
};

export interface NavigateFunction {
  (delta: number): void;
  (to: To, options?: NavigateOptions): void;
}

export type Location<State = unknown> = {
  pathname: string;
  search: string;
  hash: string;
  state: State | null;
  key: string;
};

export type URLSearchParamsInit =
  | string
  | URLSearchParams
  | Array<[string, string]>
  | Record<string, string | string[]>;

type RenderedActivity = Activity & {
  key: string;
  render: (overrideActivity?: Partial<Activity>) => ReactNode;
};

type RenderableStack = Stack & {
  render: (overrideStack?: Partial<Stack>) => {
    activities: RenderedActivity[];
  };
};

type StackflowBackHandler = () => boolean | void;
type SwipeBackTransitionOptions = {
  count?: number;
  fallbackOptions?: NavigateOptions;
  fallbackTo?: To;
  skipBackHandler?: boolean;
};
type SwipeBackTransitionRequester = (options: SwipeBackTransitionOptions) => boolean;

const HomePage = createLazyActivity(() => import("@/features/home/pages/HomePage"));
const TodayMealScorePage = createLazyActivity(
  () => import("@/features/home/pages/TodayMealScorePage"),
);
const MealDetailPage = createLazyActivity(() => import("@/features/meal-record/MealDetailPage"));
const MealRecordPage = createLazyActivity(() => import("@/features/meal-record/MealRecordPage"));
const NutrientAddPage = createLazyActivity(
  () => import("@/features/nutrient-entry/NutrientAddPage"),
);
const NutrientModifyPage = createLazyActivity(
  () => import("@/features/nutrient-entry/NutrientModifyPage"),
);
const NutrientRegisterPage = createLazyActivity(
  () => import("@/features/nutrient-entry/NutrientRegisterPage"),
);
const OnboardingPage = createLazyActivity(() => import("@/features/onboarding/OnboardingPage"));
const AppOpenSettingsFeedbackPage = createLazyActivity(
  () => import("@/features/app-open/AppOpenSettingsFeedbackPage"),
);
const BrandSearch = createLazyActivity(() => import("@/features/search/brand/BrandSearch"));
const MealSearchPage = createLazyActivity(
  () => import("@/features/search/menu-record/MealSearchPage"),
);
const SettingsFeedbackPage = createLazyActivity(
  () => import("@/features/settings/SettingsFeedbackPage"),
);
const SettingsPage = createLazyActivity(() => import("@/features/settings/SettingsPage"));
const SettingsSubCodePage = createLazyActivity(
  () => import("@/features/settings/SettingsSubCodePage"),
);
const TermsPage = createLazyActivity(() => import("@/features/terms/TermsPage"));
const MenuBoardCameraPage = createGuardedLazyActivity(
  FEATURE_GUARD.MENU_BOARD_CAMERA,
  () => import("@/features/camera/pages/MenuBoardImageRecommendationPage"),
);
const NutrientCameraPage = createLazyActivity(
  () => import("@/features/camera/pages/NutritionLabelCreatePage"),
);
const FoodCameraPage = createGuardedLazyActivity(
  FEATURE_GUARD.FOOD_CAMERA,
  () => import("@/features/camera/pages/FoodImageMealRecordCreatePage"),
);
const ProfilePage = createLazyActivity(() => import("@/features/profile/ProfilePage"));
const GoalEditPage = createLazyActivity(() => import("@/features/profile/GoalEditPage"));
const GoalEditTargetCaloriesPage = createLazyActivity(
  () => import("@/features/profile/GoalEditTargetCaloriesPage"),
);
const GoalEditNutrientPage = createLazyActivity(
  () => import("@/features/profile/GoalEditNutrientPage"),
);
const ChatPage = createGuardedLazyActivity(
  FEATURE_GUARD.CHAT,
  () => import("@/features/chat/pages/ChatPage"),
);
const DiaryPage = createLazyActivity(() => import("@/features/diary/DiaryPage"));
const RecommendResultPage = createLazyActivity(
  () => import("@/features/chat/pages/RecommendResultPage"),
);
const ChatMenuDetailPage = createLazyActivity(
  () => import("@/features/chat/pages/ChatMenuDetailPage"),
);
const FeedbackResultPage = createLazyActivity(
  () => import("@/features/chat/pages/FeedbackResultPage"),
);
const ChatCameraPage = createGuardedLazyActivity(
  FEATURE_GUARD.FOOD_CAMERA,
  () => import("@/features/camera/pages/ChatCameraPage"),
);
const ChatFoodCameraPage = createGuardedLazyActivity(
  FEATURE_GUARD.FOOD_CAMERA,
  () => import("@/features/camera/pages/FoodImageFeedbackPage"),
);
const AppInfoPage = createLazyActivity(() => import("@/features/kakao-web-auth/pages/AppInfoPage"));

const ACTIVITIES = {
  Home: HomePage,
  HomeWeightLogSheet,
  HomeStepsLogSheet,
  TodayMealScore: TodayMealScorePage,
  AppOpenSettingsFeedback: AppOpenSettingsFeedbackPage,
  Onboarding: OnboardingPage,
  Profile: ProfilePage,
  ProfileNicknameSheet: ProfileNicknameSheetPage,
  Settings: SettingsPage,
  SettingsFeedback: SettingsFeedbackPage,
  SettingsSubCode: SettingsSubCodePage,
  Terms: TermsPage,
  MealRecord: MealRecordPage,
  MealRecordAddSearch: MealSearchPage,
  MealDetail: MealDetailPage,
  MenuBoardCamera: MenuBoardCameraPage,
  FoodCamera: FoodCameraPage,
  NutrientAdd: NutrientAddPage,
  NutrientCamera: NutrientCameraPage,
  NutrientAddRegister: NutrientRegisterPage,
  NutrientAddModify: NutrientModifyPage,
  BrandSearch,
  Chat: ChatPage,
  RecommendResult: RecommendResultPage,
  RecommendDetail: ChatMenuDetailPage,
  Diary: DiaryPage,
  GoalEdit: GoalEditPage,
  GoalEditTargetCalories: GoalEditTargetCaloriesPage,
  GoalEditNutrient: GoalEditNutrientPage,
  FeedbackResult: FeedbackResultPage,
  FeedbackDetail: ChatMenuDetailPage,
  ChatCamera: ChatCameraPage,
  ChatFoodCamera: ChatFoodCameraPage,
  AppInfo: AppInfoPage,
};

const ACTIVITY_ROUTES: Record<keyof typeof ACTIVITIES, RoutePath> = {
  Home: [PATH.HOME, PATH.ROOT],
  HomeWeightLogSheet: PATH.HOME_WEIGHT_LOG_SHEET,
  HomeStepsLogSheet: PATH.HOME_STEPS_LOG_SHEET,
  TodayMealScore: PATH.TODAY_MEAL_SCORE,
  AppOpenSettingsFeedback: PATH.APP_OPEN_SETTINGS_FEEDBACK,
  Onboarding: PATH.ONBOARDING,
  Profile: PATH.PROFILE,
  ProfileNicknameSheet: PATH.PROFILE_NICKNAME_SHEET,
  Settings: PATH.SETTINGS,
  SettingsFeedback: PATH.SETTINGS_FEEDBACK,
  SettingsSubCode: PATH.SETTINGS_SUB_CODE,
  Terms: PATH.TERMS,
  MealRecord: PATH.MEAL_RECORD,
  MealRecordAddSearch: PATH.MEAL_RECORD_ADD_SEARCH,
  MealDetail: PATH.MEAL_DETAIL,
  MenuBoardCamera: PATH.MENU_BOARD_CAMERA,
  FoodCamera: PATH.FOOD_CAMERA,
  NutrientAdd: PATH.NUTRIENT_ADD,
  NutrientCamera: PATH.NUTRIENT_CAMERA,
  NutrientAddRegister: PATH.NUTRIENT_ADD_REGISTER,
  NutrientAddModify: PATH.NUTRIENT_ADD_MODIFY,
  BrandSearch: PATH.BRAND_SEARCH,
  Chat: PATH.CHAT,
  RecommendResult: PATH.RECOMMEND_RESULT,
  RecommendDetail: PATH.RECOMMEND_DETAIL,
  Diary: PATH.DIARY,
  GoalEdit: PATH.GOAL_EDIT,
  GoalEditTargetCalories: PATH.GOAL_EDIT_TARGET_CALORIES,
  GoalEditNutrient: PATH.GOAL_EDIT_NUTRIENT,
  FeedbackResult: PATH.FEEDBACK_RESULT,
  FeedbackDetail: PATH.FEEDBACK_DETAIL,
  ChatCamera: PATH.CHAT_CAMERA,
  ChatFoodCamera: PATH.CHAT_FOOD_CAMERA,
  AppInfo: PATH.APP_INFO,
};

type ActivityName = keyof typeof ACTIVITY_ROUTES;
const BOTTOM_SHEET_ACTIVITY_NAMES = new Set<ActivityName>([
  "HomeWeightLogSheet",
  "HomeStepsLogSheet",
  "ProfileNicknameSheet",
]);

const STACK_TRANSITION_DURATION = 270;
const EDGE_SWIPE_WIDTH = 44;
const SWIPE_CANCEL_DISTANCE = -12;
const SWIPE_START_DISTANCE = 4;
const SWIPE_TRIGGER_RATIO = 0.12;
const SWIPE_VELOCITY_MIN_DISTANCE = 20;
const SWIPE_VELOCITY_TRIGGER = 0.45;
const SWIPE_VERTICAL_CANCEL_DISTANCE = 32;
const SWIPE_VERTICAL_CANCEL_RATIO = 2.4;

const activityNavigationStateMap = new Map<string, unknown>();
const stackflowBackHandlerMap = new Map<string, StackflowBackHandler>();
let lastScreenViewKey: string | null = null;
let pruneActivityNavigationStateTimeoutId: number | null = null;
let activeSwipeBackTransitionRequester: SwipeBackTransitionRequester | null = null;

function createLazyActivity(loader: () => Promise<{ default: ComponentType }>) {
  const LazyPage = lazy(loader);

  return function LazyActivity() {
    return (
      // 페이지 이동마다 생기는 로딩. 각 탭 페이지의 chunk가 로드되면 보여지지 않음
      <Suspense fallback={<LoadingScreen background="var(--bg-normal)" />}>
        <LazyPage />
      </Suspense>
    );
  };
}

function RedirectActivity({ to }: { to: To }) {
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to]);

  return null;
}

function createGuardedLazyActivity(
  feature: FeatureGuardTarget,
  loader: () => Promise<{ default: ComponentType }>,
) {
  const Activity = createLazyActivity(loader);

  return function GuardedActivity() {
    const isBlocked = useIsFeatureBlocked(feature);

    if (isBlocked) {
      return <RedirectActivity to={PATH.HOME} />;
    }

    return <Activity />;
  };
}

function normalizePathname(pathname: string) {
  if (pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function normalizeSearch(search: string | undefined) {
  if (!search) return "";
  return search.startsWith("?") ? search : `?${search}`;
}

function normalizeHash(hash: string | undefined) {
  if (!hash) return "";
  return hash.startsWith("#") ? hash : `#${hash}`;
}

function toPathString(to: To) {
  if (typeof to === "string") return to;

  const pathname = to.pathname ?? window.location.pathname;
  return `${pathname}${normalizeSearch(to.search)}${normalizeHash(to.hash)}`;
}

function getRoutePaths(activityName: ActivityName): readonly string[] {
  const route = ACTIVITY_ROUTES[activityName];
  return typeof route === "string" ? [route] : route;
}

function getPrimaryRoutePath(activityName: ActivityName) {
  return getRoutePaths(activityName)[0];
}

function isActivityName(value: string): value is ActivityName {
  return value in ACTIVITY_ROUTES;
}

function isBottomSheetActivityName(value: string) {
  return isActivityName(value) && BOTTOM_SHEET_ACTIVITY_NAMES.has(value);
}

function resolveActivityForPath(
  to: To,
): { activityName: ActivityName; params: ActivityParams } | null {
  const rawPath = toPathString(to);
  let url: URL;

  try {
    url = new URL(rawPath, window.location.origin);
  } catch {
    return null;
  }

  const pathname = normalizePathname(url.pathname);
  const activityName = (Object.keys(ACTIVITY_ROUTES) as ActivityName[]).find((name) =>
    getRoutePaths(name).some((routePath) => normalizePathname(routePath) === pathname),
  );

  if (!activityName) return null;

  return {
    activityName,
    params: Object.fromEntries(url.searchParams.entries()),
  };
}

function makePathFromActivity(activityName: ActivityName, params: ActivityParams) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return `${getPrimaryRoutePath(activityName)}${query ? `?${query}` : ""}`;
}

function splitPath(path: string) {
  const url = new URL(path, window.location.origin);
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
}

function getComparablePath(path: string) {
  const { pathname, search, hash } = splitPath(path);
  return `${normalizePathname(pathname)}${search}${hash}`;
}

function getCurrentBrowserPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getActivityPath(activity: Activity) {
  const contextPath = (activity.context as { path?: string } | undefined)?.path;
  if (contextPath) return contextPath;

  if (isActivityName(activity.name)) {
    return makePathFromActivity(activity.name, activity.params);
  }

  return PATH.HOME;
}

function setActivityNavigationState(activityId: string, state: unknown) {
  if (state === undefined) {
    activityNavigationStateMap.delete(activityId);
    return;
  }

  activityNavigationStateMap.set(activityId, state);
}

function getActivityNavigationState<State>(activityId: string): State | null {
  if (!activityNavigationStateMap.has(activityId)) return null;
  return activityNavigationStateMap.get(activityId) as State;
}

function pruneActivityNavigationStateMap() {
  const activeIds = new Set(
    stackflowActions
      .getStack()
      .activities.filter((activity) => activity.transitionState !== "exit-done")
      .map((activity) => activity.id),
  );

  activityNavigationStateMap.forEach((_, activityId) => {
    if (!activeIds.has(activityId)) {
      activityNavigationStateMap.delete(activityId);
    }
  });
}

function scheduleActivityNavigationStatePrune() {
  if (typeof window === "undefined") return;

  if (pruneActivityNavigationStateTimeoutId !== null) {
    window.clearTimeout(pruneActivityNavigationStateTimeoutId);
  }

  pruneActivityNavigationStateTimeoutId = window.setTimeout(() => {
    pruneActivityNavigationStateTimeoutId = null;
    pruneActivityNavigationStateMap();
  }, STACK_TRANSITION_DURATION + 50);
}

function setStackDepth(depth: number) {
  if (typeof window !== "undefined") {
    Object.assign(window, { __STACKFLOW_STACK_DEPTH__: depth });
  }
}

function getBackStackDepth(stack: Stack) {
  return stack.activities.filter((activity) => !activity.exitedBy).length;
}

function getActiveStackActivities() {
  return stackflowActions
    .getStack()
    .activities.filter((activity) => !activity.exitedBy)
    .sort((prev, next) => prev.enteredBy.eventDate - next.enteredBy.eventDate);
}

function getActiveActivity() {
  return stackflowActions.getStack().activities.find((activity) => activity.isActive);
}

function runActiveBackHandler(skipBackHandler: boolean | undefined) {
  if (skipBackHandler) return false;

  const activeActivity = getActiveActivity();
  if (!activeActivity) return false;

  return stackflowBackHandlerMap.get(activeActivity.id)?.() === true;
}

function createSearchParams(init?: URLSearchParamsInit) {
  if (!init) return new URLSearchParams();

  if (typeof init === "string" || init instanceof URLSearchParams || Array.isArray(init)) {
    return new URLSearchParams(init);
  }

  const params = new URLSearchParams();

  Object.entries(init).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    params.set(key, value);
  });

  return params;
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function isEdgeSwipeZone(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.dataset.stackflowEdgeSwipeZone === "true";
}

function getClickableElementAtPoint(x: number, y: number) {
  const target = document.elementFromPoint(x, y);
  if (!(target instanceof Element)) return null;

  const clickableTarget = target.closest<HTMLElement>(
    "button, a, input, textarea, select, [role='button'], [tabindex]",
  );
  if (clickableTarget) return clickableTarget;

  return target instanceof HTMLElement ? target : null;
}

function forwardTapThroughEdgeSwipeZone(
  event: ReactPointerEvent<HTMLElement>,
  pointerDownTarget: EventTarget | null,
) {
  if (!isEdgeSwipeZone(pointerDownTarget)) return;

  const edgeSwipeZone = pointerDownTarget;
  const previousPointerEvents = edgeSwipeZone.style.pointerEvents;
  edgeSwipeZone.style.pointerEvents = "none";

  const target = getClickableElementAtPoint(event.clientX, event.clientY);
  edgeSwipeZone.style.pointerEvents = previousPointerEvents;

  target?.click();
}

function stackflowRendererPlugin(): StackflowReactPlugin<typeof ACTIVITIES> {
  return () => ({
    key: "melo-stack-renderer",
    render({ stack }) {
      return <StackRenderer stack={stack} />;
    },
  });
}

function StackRenderer({ stack }: { stack: RenderableStack }) {
  const { activities } = stack.render();
  const visibleActivities = activities.filter(
    (activity) =>
      activity.transitionState === "enter-active" ||
      activity.transitionState === "enter-done" ||
      activity.transitionState === "exit-active",
  );
  const latestEventName = stack.events.at(-1)?.name;
  const isBackTransition = latestEventName === "Popped" || latestEventName === "StepPopped";

  if (visibleActivities.length === 0) {
    return <EmptyStackFallback />;
  }

  return (
    <div className={styles.stackRoot}>
      {visibleActivities.map((activity) => (
        <StackActivityFrame
          activity={activity}
          key={activity.key}
          shouldAnimateEnter={activity.transitionState === "enter-active" && !isBackTransition}
        />
      ))}
    </div>
  );
}

function EmptyStackFallback() {
  useEffect(() => {
    syncStackflowWithCurrentBrowserPath({ animate: false });
  }, []);

  return null;
}

function StackActivityFrame({
  activity,
  shouldAnimateEnter,
}: {
  activity: RenderedActivity;
  shouldAnimateEnter: boolean;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const swipeRef = useRef<{
    dragging: boolean;
    lastTime: number;
    lastX: number;
    pointerId: number;
    startX: number;
    startY: number;
    pointerDownTarget: EventTarget | null;
    velocity: number;
    width: number;
  } | null>(null);
  const pendingSwipeBackTransitionOptionsRef = useRef<SwipeBackTransitionOptions | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isSwipePending, setIsSwipePending] = useState(false);
  const [isSwipeCompleting, setIsSwipeCompleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const isBottomSheetActivity = isBottomSheetActivityName(activity.name);
  const canSwipeBack =
    !isBottomSheetActivity &&
    activity.isTop &&
    !activity.isRoot &&
    activity.transitionState === "enter-done" &&
    canGoBackWithStack();

  const clearSwipe = useCallback(() => {
    swipeRef.current = null;
    pendingSwipeBackTransitionOptionsRef.current = null;
    setDragX(0);
    setIsSwipePending(false);
    setIsSwipeCompleting(false);
    setIsDragging(false);
    setIsResetting(false);
  }, []);

  const snapBackSwipe = useCallback(() => {
    swipeRef.current = null;
    pendingSwipeBackTransitionOptionsRef.current = null;
    setIsSwipePending(false);
    setIsSwipeCompleting(false);
    setIsDragging(false);
    setIsResetting(true);
    setDragX(0);
  }, []);

  useEffect(() => {
    if (activity.transitionState === "enter-done") return;
    swipeRef.current = null;
    pendingSwipeBackTransitionOptionsRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      setDragX(0);
      setIsSwipePending(false);
      setIsSwipeCompleting(false);
      setIsDragging(false);
      setIsResetting(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activity.key, activity.transitionState]);

  const startSwipeBackTransition = useCallback(
    (options: SwipeBackTransitionOptions) => {
      if (!canSwipeBack || isSwipePending || isSwipeCompleting || isDragging || isResetting) {
        return false;
      }

      const frameWidth = frameRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      pendingSwipeBackTransitionOptionsRef.current = options;
      swipeRef.current = null;
      setDragX(frameWidth);
      setIsSwipePending(false);
      setIsSwipeCompleting(true);
      setIsDragging(false);
      setIsResetting(false);
      return true;
    },
    [canSwipeBack, isDragging, isResetting, isSwipeCompleting, isSwipePending],
  );

  useEffect(() => {
    if (!canSwipeBack) {
      return;
    }

    activeSwipeBackTransitionRequester = startSwipeBackTransition;

    return () => {
      if (activeSwipeBackTransitionRequester === startSwipeBackTransition) {
        activeSwipeBackTransitionRequester = null;
      }
    };
  }, [canSwipeBack, startSwipeBackTransition]);

  useEffect(() => {
    if (!activity.isTop || activity.transitionState !== "enter-done") {
      return;
    }

    const path = getActivityPath(activity);
    const screenViewKey = `${activity.id}:${path}`;
    if (lastScreenViewKey === screenViewKey) {
      return;
    }

    lastScreenViewKey = screenViewKey;
    track(EVENT_NAME.SCREEN_VIEW, {
      screen_name: activity.name,
      path,
      stack_depth: getBackStackDepth(stackflowActions.getStack()),
    });
  }, [activity]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canSwipeBack || isEditableElement(event.target)) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.clientX > EDGE_SWIPE_WIDTH) return;

      const rect = event.currentTarget.getBoundingClientRect();
      swipeRef.current = {
        dragging: false,
        lastTime: performance.now(),
        lastX: event.clientX,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        pointerDownTarget: event.target,
        velocity: 0,
        width: rect.width,
      };
      setDragX(0);
      setIsSwipePending(true);
      setIsSwipeCompleting(false);
      setIsDragging(false);
      setIsResetting(false);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canSwipeBack],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;

      const dx = event.clientX - swipe.startX;
      const dy = event.clientY - swipe.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (!swipe.dragging) {
        const isVerticalScroll =
          absDy >= SWIPE_VERTICAL_CANCEL_DISTANCE &&
          absDy > Math.max(absDx, SWIPE_START_DISTANCE) * SWIPE_VERTICAL_CANCEL_RATIO;

        if (dx < SWIPE_CANCEL_DISTANCE || isVerticalScroll) {
          clearSwipe();
          return;
        }

        if (dx < SWIPE_START_DISTANCE) {
          event.preventDefault();
          return;
        }

        swipe.dragging = true;
        setIsSwipePending(false);
        setIsDragging(true);
      }

      const now = performance.now();
      const elapsed = Math.max(now - swipe.lastTime, 1);
      swipe.velocity = (event.clientX - swipe.lastX) / elapsed;
      swipe.lastX = event.clientX;
      swipe.lastTime = now;

      setDragX(Math.max(0, Math.min(dx, swipe.width)));
      event.preventDefault();
    },
    [clearSwipe],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;

      const finalDragX = Math.max(0, Math.min(event.clientX - swipe.startX, swipe.width));
      const shouldPop =
        swipe.dragging &&
        (finalDragX >= swipe.width * SWIPE_TRIGGER_RATIO ||
          (finalDragX >= SWIPE_VELOCITY_MIN_DISTANCE && swipe.velocity >= SWIPE_VELOCITY_TRIGGER));

      swipeRef.current = null;
      setIsSwipePending(false);
      setIsDragging(false);

      if (shouldPop) {
        pendingSwipeBackTransitionOptionsRef.current = null;
        setDragX(swipe.width);
        setIsSwipeCompleting(true);
        return;
      }

      if (!swipe.dragging) {
        forwardTapThroughEdgeSwipeZone(event, swipe.pointerDownTarget);
        clearSwipe();
        return;
      }

      setIsResetting(true);
      setDragX(0);
    },
    [clearSwipe],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;
      snapBackSwipe();
    },
    [snapBackSwipe],
  );

  const handleLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;
      snapBackSwipe();
    },
    [snapBackSwipe],
  );

  const handleTransitionEnd = useCallback(
    (event: ReactTransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.propertyName !== "transform") return;

      if (isSwipeCompleting) {
        const pendingOptions = pendingSwipeBackTransitionOptionsRef.current;
        pendingSwipeBackTransitionOptionsRef.current = null;
        const didNavigateBack = navigateBack({
          animate: false,
          ...(pendingOptions ?? {}),
        });

        if (!didNavigateBack) {
          setIsSwipeCompleting(false);
          setIsResetting(true);
          setDragX(0);
        }
        return;
      }

      if (!isResetting) return;
      setIsResetting(false);
    },
    [isResetting, isSwipeCompleting],
  );

  const frameStyle = {
    "--stackflow-drag-x": `${dragX}px`,
    "--stackflow-edge-swipe-width": `${EDGE_SWIPE_WIDTH}px`,
    zIndex: activity.zIndex,
  } as CSSProperties;

  return (
    <div
      ref={frameRef}
      className={styles.activityFrame}
      data-dragging={isDragging ? "true" : undefined}
      data-bottom-sheet={isBottomSheetActivity ? "true" : undefined}
      data-enter-animation={shouldAnimateEnter && !isBottomSheetActivity ? "true" : undefined}
      data-resetting={isResetting ? "true" : undefined}
      data-root={activity.isRoot ? "true" : undefined}
      data-swipe-completing={isSwipeCompleting ? "true" : undefined}
      data-swipe-pending={isSwipePending ? "true" : undefined}
      data-top={activity.isTop ? "true" : undefined}
      data-transition-state={activity.transitionState}
      onLostPointerCapture={handleLostPointerCapture}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTransitionEnd={handleTransitionEnd}
      style={frameStyle}
    >
      {activity.render()}
      {canSwipeBack ? (
        <div
          aria-hidden="true"
          className={styles.edgeSwipeZone}
          data-stackflow-edge-swipe-zone="true"
        />
      ) : null}
    </div>
  );
}

const { Stack: InternalStackflowStack, actions: stackflowActions } = stackflow({
  transitionDuration: STACK_TRANSITION_DURATION,
  activities: ACTIVITIES,
  plugins: [
    stackflowRendererPlugin(),
    historySyncPlugin({
      routes: ACTIVITY_ROUTES,
      fallbackActivity: () => "Home",
    }),
    stackDepthChangePlugin({
      onInit({ depth }) {
        setStackDepth(depth);
      },
      onDepthChanged({ depth }) {
        setStackDepth(depth);
      },
    }),
    ...(import.meta.env.DEV ? [devtoolsPlugin()] : []),
  ],
});

export function navigate(to: To, options?: NavigateOptions): void;
export function navigate(delta: number): void;
export function navigate(toOrDelta: To | number, options?: NavigateOptions) {
  if (typeof toOrDelta === "number") {
    if (toOrDelta < 0) {
      navigateBack({ animate: true, count: Math.abs(toOrDelta) });
      return;
    }

    return;
  }

  const resolved = resolveActivityForPath(toOrDelta);
  if (!resolved) {
    window.location.assign(toPathString(toOrDelta));
    return;
  }

  const actionOptions = options?.animate == null ? undefined : { animate: options.animate };
  const result = options?.replace
    ? (() => {
        const activityId = createStackflowActivityId();

        return stackflowActions.replace(resolved.activityName, resolved.params, {
          ...actionOptions,
          activityId,
        });
      })()
    : stackflowActions.push(resolved.activityName, resolved.params, actionOptions);

  setActivityNavigationState(result.activityId, options?.state);
  pruneActivityNavigationStateMap();
}

export function navigateBackAndPush({
  animate = true,
  count = 1,
  fallbackOptions,
  pushOptions,
  skipBackHandler = false,
  to,
  fallbackTo = to,
}: {
  animate?: boolean;
  count?: number;
  fallbackOptions?: NavigateOptions;
  fallbackTo?: To;
  pushOptions?: Omit<NavigateOptions, "replace">;
  skipBackHandler?: boolean;
  to: To;
}) {
  if (runActiveBackHandler(skipBackHandler)) {
    return false;
  }

  const backStackDepth = getBackStackDepth(stackflowActions.getStack());
  const requestedCount = Math.max(1, count);

  if (backStackDepth - 1 < requestedCount) {
    navigate(fallbackTo, {
      animate: false,
      ...pushOptions,
      ...fallbackOptions,
      replace: true,
    });
    return true;
  }

  const resolved = resolveActivityForPath(to);
  if (!resolved) {
    window.location.assign(toPathString(to));
    return true;
  }

  const actionOptions = pushOptions?.animate == null ? undefined : { animate: pushOptions.animate };

  // Buffer Stackflow events so pop + push is reduced as one navigation change.
  stackflowActions.dispatchEvent("Paused", {});
  try {
    stackflowActions.pop(requestedCount, { animate });
    const result = stackflowActions.push(resolved.activityName, resolved.params, actionOptions);
    setActivityNavigationState(result.activityId, pushOptions?.state);
  } finally {
    stackflowActions.dispatchEvent("Resumed", {});
    pruneActivityNavigationStateMap();
    if (animate) {
      scheduleActivityNavigationStatePrune();
    }
  }

  return true;
}

export function navigateBack({
  animate = true,
  count = 1,
  fallbackOptions,
  fallbackTo,
  skipBackHandler = false,
}: {
  animate?: boolean;
  count?: number;
  fallbackOptions?: NavigateOptions;
  fallbackTo?: To;
  skipBackHandler?: boolean;
} = {}) {
  const backStackDepth = getBackStackDepth(stackflowActions.getStack());
  const safeCount = Math.min(Math.max(1, count), Math.max(0, backStackDepth - 1));

  if (
    animate &&
    safeCount === 1 &&
    activeSwipeBackTransitionRequester?.({
      count: safeCount,
      fallbackOptions,
      fallbackTo,
      skipBackHandler,
    }) === true
  ) {
    return true;
  }

  if (runActiveBackHandler(skipBackHandler)) {
    return false;
  }

  if (safeCount > 0) {
    stackflowActions.pop(safeCount, { animate });
    pruneActivityNavigationStateMap();
    if (animate) {
      scheduleActivityNavigationStatePrune();
    }
    return true;
  }

  if (fallbackTo) {
    navigate(fallbackTo, {
      animate: false,
      ...fallbackOptions,
      replace: true,
    });
    return true;
  }

  if (isNativeApp()) {
    requestAppBack();
    return true;
  }

  return false;
}

setStackflowNavigateBackHandler(navigateBack);

function replaceStackWithActivity({
  activityName,
  animate,
  params,
  state,
}: {
  activityName: ActivityName;
  animate: boolean;
  params: ActivityParams;
  state?: unknown;
}) {
  const stack = stackflowActions.getStack();
  const backStackDepth = getBackStackDepth(stack);

  for (let index = 1; index < backStackDepth; index += 1) {
    stackflowActions.dispatchEvent("Popped", { skipExitActiveState: true });
  }

  const result = stackflowActions.replace(activityName, params, {
    animate,
    activityId: createStackflowActivityId(),
  });

  setActivityNavigationState(result.activityId, state);
  pruneActivityNavigationStateMap();
}

export function resetStackflow(
  to: To,
  { animate = true, state }: Omit<NavigateOptions, "replace"> = {},
) {
  const resolved = resolveActivityForPath(to);
  if (!resolved) {
    window.location.assign(toPathString(to));
    return;
  }

  replaceStackWithActivity({
    activityName: resolved.activityName,
    animate,
    params: resolved.params,
    state,
  });
}

export function resetStackflowWithCurrentBrowserPath({
  animate = true,
}: { animate?: boolean } = {}) {
  const currentPath = getCurrentBrowserPath();
  const resolved = resolveActivityForPath(currentPath);

  replaceStackWithActivity({
    activityName: resolved?.activityName ?? "Home",
    animate,
    params: resolved?.params ?? {},
    state: null,
  });
}

function canGoBackWithStack() {
  return getBackStackDepth(stackflowActions.getStack()) > 1;
}

export function pushStackflowPath(to: To, { animate = true }: { animate?: boolean } = {}) {
  const activeActivity = stackflowActions
    .getStack()
    .activities.find((activity) => activity.isActive);

  if (
    activeActivity &&
    getComparablePath(getActivityPath(activeActivity)) === getComparablePath(toPathString(to))
  ) {
    return;
  }

  const resolved = resolveActivityForPath(to);
  if (!resolved) {
    resetStackflowWithCurrentBrowserPath({ animate: false });
    return;
  }

  const result = stackflowActions.push(resolved.activityName, resolved.params, { animate });
  setActivityNavigationState(result.activityId, null);
  pruneActivityNavigationStateMap();
}

export function isPreviousStackActivity(activityName: string) {
  const activities = getActiveStackActivities();
  const previousActivity = activities.at(-2);

  return previousActivity?.name === activityName;
}

export function syncStackflowWithCurrentBrowserPath({
  animate = true,
}: { animate?: boolean } = {}) {
  const currentPath = getCurrentBrowserPath();
  const activeActivity = stackflowActions
    .getStack()
    .activities.find((activity) => activity.isActive);

  if (
    activeActivity &&
    getComparablePath(getActivityPath(activeActivity)) === getComparablePath(currentPath)
  ) {
    return;
  }

  const resolved = resolveActivityForPath(currentPath);
  if (!resolved) {
    stackflowActions.replace("Home", {}, { animate });
    pruneActivityNavigationStateMap();
    return;
  }

  stackflowActions.replace(resolved.activityName, resolved.params, { animate });
  pruneActivityNavigationStateMap();
}

export function useNavigate(): NavigateFunction {
  const appNavigate = useCallback((toOrDelta: To | number, options?: NavigateOptions) => {
    if (typeof toOrDelta === "number") {
      navigate(toOrDelta);
      return;
    }

    navigate(toOrDelta, options);
  }, []);

  return appNavigate as NavigateFunction;
}

export function useLocation<State = unknown>(): Location<State> {
  const activity = useActivity();

  return useMemo(() => {
    const path = getActivityPath(activity);
    const { pathname, search, hash } = splitPath(path);

    return {
      pathname,
      search,
      hash,
      state: getActivityNavigationState<State>(activity.id),
      key: activity.id,
    };
  }, [activity]);
}

export function useSearchParams(): [
  URLSearchParams,
  (
    nextInit: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit),
    navigateOptions?: NavigateOptions,
  ) => void,
] {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const setSearchParams = useCallback(
    (
      nextInit: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit),
      navigateOptions?: NavigateOptions,
    ) => {
      const nextSearchParams = createSearchParams(
        typeof nextInit === "function" ? nextInit(new URLSearchParams(searchParams)) : nextInit,
      );
      const query = nextSearchParams.toString();

      navigate(`${location.pathname}${query ? `?${query}` : ""}${location.hash}`, {
        animate: navigateOptions?.animate,
        replace: navigateOptions?.replace ?? true,
        state: navigateOptions?.state ?? location.state,
      });
    },
    [location.hash, location.pathname, location.state, searchParams],
  );

  return [searchParams, setSearchParams];
}

export function useStackflowBackHandler(handler: StackflowBackHandler | null | undefined) {
  const activity = useActivity();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!handler) return;

    const backHandler = () => handlerRef.current?.();
    stackflowBackHandlerMap.set(activity.id, backHandler);

    return () => {
      if (stackflowBackHandlerMap.get(activity.id) === backHandler) {
        stackflowBackHandlerMap.delete(activity.id);
      }
    };
  }, [activity.id, handler]);
}

export function getStackflowStackComponent() {
  return InternalStackflowStack;
}
