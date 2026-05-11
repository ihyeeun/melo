/* eslint-disable react-refresh/only-export-components */
import type { Activity, Stack } from "@stackflow/core";
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
  useSyncExternalStore,
} from "react";

import AccountDeletePage from "@/features/account-delete/AccountDeletePage";
import { PATH } from "@/router/path";
import { isNativeApp, requestAppBack } from "@/shared/api/bridge/nativeBridge";
import { FEATURE_GUARD, type FeatureGuardTarget, isFeatureBlocked } from "@/shared/guards/featureGuard";

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

const HomePage = createLazyActivity(() => import("@/features/home/HomePage"));
const TodayMealScorePage = createLazyActivity(() => import("@/features/home/TodayMealScorePage"));
const MealDetailPage = createLazyActivity(() => import("@/features/meal-record/MealDetailPage"));
const MealRecordPage = createLazyActivity(() => import("@/features/meal-record/MealRecordPage"));
const NutrientAddPage = createLazyActivity(() => import("@/features/nutrient-entry/NutrientAddPage"));
const NutrientModifyPage = createLazyActivity(() => import("@/features/nutrient-entry/NutrientModifyPage"));
const NutrientRegisterPage = createLazyActivity(() => import("@/features/nutrient-entry/NutrientRegisterPage"));
const OnboardingPage = createLazyActivity(() => import("@/features/onboarding/OnboardingPage"));
const RecommendPage = createLazyActivity(() => import("@/features/recommend/RecommendPage"));
const BrandSearch = createLazyActivity(() => import("@/features/search/brand/BrandSearch"));
const MealSearchPage = createLazyActivity(() => import("@/features/search/menu-record/MealSearchPage"));
const SettingsFeedbackPage = createLazyActivity(() => import("@/features/settings/SettingsFeedbackPage"));
const SettingsPage = createLazyActivity(() => import("@/features/settings/SettingsPage"));
const SettingsSubCodePage = createLazyActivity(() => import("@/features/settings/SettingsSubCodePage"));
const TermsPage = createLazyActivity(() => import("@/features/terms/TermsPage"));
const MenuBoardCameraPage = createGuardedLazyActivity(
  FEATURE_GUARD.MENU_BOARD_CAMERA,
  () => import("@/features/camera/MenuBoardCameraPage"),
);
const NutrientCameraPage = createLazyActivity(() => import("@/features/camera/NutrientCameraPage"));
const FoodCameraPage = createGuardedLazyActivity(
  FEATURE_GUARD.FOOD_CAMERA,
  () => import("@/features/camera/FoodCameraPage"),
);
const ProfilePage = createLazyActivity(() => import("@/features/profile/ProfilePage"));
const GoalEditPage = createLazyActivity(() => import("@/features/profile/GoalEditPage"));
const ChatPage = createGuardedLazyActivity(FEATURE_GUARD.CHAT, () => import("@/features/chat/ChatPage"));
const DiaryPage = createLazyActivity(() => import("@/features/diary/DiaryPage"));
const RecommendResultPage = createLazyActivity(() => import("@/features/chat/RecommendResultPage"));
const RecommendDetailPage = createLazyActivity(() => import("@/features/chat/RecommendDetailPage"));

const ACTIVITIES = {
  Home: HomePage,
  TodayMealScore: TodayMealScorePage,
  Onboarding: OnboardingPage,
  Recommend: RecommendPage,
  Profile: ProfilePage,
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
  RecommendDetail: RecommendDetailPage,
  Diary: DiaryPage,
  GoalEdit: GoalEditPage,
  GoalEditTargetCalories: GoalEditPage,
  GoalEditNutrient: GoalEditPage,
  AccountDelete: createStaticActivity(AccountDeletePage),
};

const ACTIVITY_ROUTES: Record<keyof typeof ACTIVITIES, RoutePath> = {
  Home: [PATH.HOME, PATH.ROOT],
  TodayMealScore: PATH.TODAY_MEAL_SCORE,
  Onboarding: PATH.ONBOARDING,
  Recommend: PATH.RECOMMEND,
  Profile: PATH.PROFILE,
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
  AccountDelete: "/account-delete",
};

type ActivityName = keyof typeof ACTIVITY_ROUTES;

const EDGE_SWIPE_WIDTH = 28;
const SWIPE_CANCEL_DISTANCE = -8;
const SWIPE_START_DISTANCE = 8;
const SWIPE_TRIGGER_RATIO = 0.2;

const activityNavigationStateMap = new Map<string, unknown>();
const stackflowBackHandlerMap = new Map<string, StackflowBackHandler>();
const stackDepthListeners = new Set<() => void>();

let currentStackDepth = 0;

function createLazyActivity(loader: () => Promise<{ default: ComponentType }>) {
  const LazyPage = lazy(loader);

  return function LazyActivity() {
    return (
      <Suspense fallback={null}>
        <LazyPage />
      </Suspense>
    );
  };
}

function createStaticActivity(Page: ComponentType) {
  return function StaticActivity() {
    return <Page />;
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
    if (isFeatureBlocked(feature)) {
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

function resolveActivityForPath(to: To): { activityName: ActivityName; params: ActivityParams } | null {
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

function setStackDepth(depth: number) {
  currentStackDepth = depth;

  if (typeof window !== "undefined") {
    Object.assign(window, { __STACKFLOW_STACK_DEPTH__: depth });
  }

  stackDepthListeners.forEach((listener) => listener());
}

function getBackStackDepth(stack: Stack) {
  return stack.activities.filter((activity) => !activity.exitedBy).length;
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

function subscribeStackDepth(listener: () => void) {
  stackDepthListeners.add(listener);
  return () => {
    stackDepthListeners.delete(listener);
  };
}

function getStackDepthSnapshot() {
  return currentStackDepth;
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
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
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

  return (
    <div className={styles.stackRoot}>
      {activities.map((activity) => (
        <StackActivityFrame activity={activity} key={activity.key} />
      ))}
    </div>
  );
}

function StackActivityFrame({ activity }: { activity: RenderedActivity }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const swipeRef = useRef<{
    dragging: boolean;
    lastTime: number;
    lastX: number;
    pointerId: number;
    startX: number;
    startY: number;
    velocity: number;
    width: number;
  } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const canSwipeBack =
    activity.isTop &&
    !activity.isRoot &&
    activity.transitionState === "enter-done" &&
    canGoBackWithStack();

  const clearSwipe = useCallback(() => {
    swipeRef.current = null;
    setDragX(0);
    setIsDragging(false);
    setIsResetting(false);
  }, []);

  const snapBackSwipe = useCallback(() => {
    swipeRef.current = null;
    setIsDragging(false);
    setIsResetting(true);
    setDragX(0);
  }, []);

  useEffect(() => {
    if (activity.transitionState === "enter-done") return;
    swipeRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      setDragX(0);
      setIsDragging(false);
      setIsResetting(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activity.key, activity.transitionState]);

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
        velocity: 0,
        width: rect.width,
      };
      setDragX(0);
      setIsDragging(false);
      setIsResetting(false);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canSwipeBack],
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;

    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;

    if (!swipe.dragging) {
      if (dx < SWIPE_CANCEL_DISTANCE || Math.abs(dy) > Math.max(dx, SWIPE_START_DISTANCE) * 1.4) {
        clearSwipe();
        return;
      }

      if (dx < SWIPE_START_DISTANCE) return;

      swipe.dragging = true;
      setIsDragging(true);
    }

    const now = performance.now();
    const elapsed = Math.max(now - swipe.lastTime, 1);
    swipe.velocity = (event.clientX - swipe.lastX) / elapsed;
    swipe.lastX = event.clientX;
    swipe.lastTime = now;

    setDragX(Math.max(0, Math.min(dx, swipe.width)));
    event.preventDefault();
  }, [clearSwipe]);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;

      const finalDragX = Math.max(0, Math.min(event.clientX - swipe.startX, swipe.width));
      const shouldPop =
        swipe.dragging && finalDragX >= swipe.width * SWIPE_TRIGGER_RATIO;

      swipeRef.current = null;
      setIsDragging(false);

      if (shouldPop) {
        const didNavigateBack = navigateBack({ animate: true });

        setDragX(0);
        setIsResetting(!didNavigateBack);
        return;
      }

      if (!swipe.dragging) {
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
      if (event.propertyName !== "transform") return;
      if (!isResetting) return;
      setIsResetting(false);
    },
    [isResetting],
  );

  const frameStyle = {
    "--stackflow-drag-x": `${dragX}px`,
    zIndex: activity.zIndex,
  } as CSSProperties;

  return (
    <div
      ref={frameRef}
      className={styles.activityFrame}
      data-dragging={isDragging ? "true" : undefined}
      data-resetting={isResetting ? "true" : undefined}
      data-root={activity.isRoot ? "true" : undefined}
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
    </div>
  );
}

const { Stack: InternalStackflowStack, actions: stackflowActions } = stackflow({
  transitionDuration: 270,
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
    ? stackflowActions.replace(resolved.activityName, resolved.params, actionOptions)
    : stackflowActions.push(resolved.activityName, resolved.params, actionOptions);

  setActivityNavigationState(result.activityId, options?.state);
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
  if (runActiveBackHandler(skipBackHandler)) {
    return false;
  }

  if (canGoBackWithStack()) {
    stackflowActions.pop(count, { animate });
    return true;
  }

  if (fallbackTo) {
    navigate(fallbackTo, {
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

export function canGoBackWithStack() {
  return getBackStackDepth(stackflowActions.getStack()) > 1;
}

export function syncStackflowWithCurrentBrowserPath({ animate = true }: { animate?: boolean } = {}) {
  const currentPath = getCurrentBrowserPath();
  const activeActivity = stackflowActions.getStack().activities.find((activity) => activity.isActive);

  if (activeActivity && getComparablePath(getActivityPath(activeActivity)) === getComparablePath(currentPath)) {
    return;
  }

  const resolved = resolveActivityForPath(currentPath);
  if (!resolved) {
    stackflowActions.replace("Home", {}, { animate });
    return;
  }

  stackflowActions.replace(resolved.activityName, resolved.params, { animate });
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

export function useStackDepth() {
  return useSyncExternalStore(subscribeStackDepth, getStackDepthSnapshot, getStackDepthSnapshot);
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
