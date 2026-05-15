import { Camera, ChevronRight, ChevronUp, CircleAlert, Plus, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSendMessageMutation } from "@/features/chat/hooks/mutations/useSendMessageMutation";
import { useGetChatHistoryQuery } from "@/features/chat/hooks/queries/useGetChatQuery";
import styles from "@/features/chat/styles/ChatPage.module.css";
import { getMealTypeFromCurrentTime } from "@/features/chat/utils/chatMeal";
import {
  getFeedbackResultPath,
  getRecommendDetailPath,
  getRecommendResultPath,
} from "@/features/chat/utils/recommendNavigation";
import {
  formatMenuDraftKey,
  useMenuDraftInit,
} from "@/features/meal-record/stores/menuDraft.store";
import { PATH } from "@/router/path";
import { getMealSearchPath } from "@/router/pathHelpers";
import { AppApiError } from "@/shared/api/appApi";
import { type ChatRecommendItemResponseDto, type FeedbackDto } from "@/shared/api/types/api.dto";
import { DataSourceBadge } from "@/shared/commons/badge/DataSourceBadge";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack, useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import { formatDateDividerText, formatDateKey, parseDate } from "@/shared/utils/dateFormat";

const QUICK_CHIP_LIST = ["지금 먹기 좋은 메뉴를 추천해줘"];
const FEEDBACK_GAUGE_VIEWBOX_WIDTH = 220;
const FEEDBACK_GAUGE_VIEWBOX_HEIGHT = 100;
const FEEDBACK_GAUGE_CENTER_X = 110;
const FEEDBACK_GAUGE_CENTER_Y = 95;
const FEEDBACK_GAUGE_RADIUS = 75;
const FEEDBACK_GAUGE_START_ANGLE = 170;
const FEEDBACK_GAUGE_END_ANGLE = 10;
const FEEDBACK_GAUGE_PATH = getFeedbackGaugePath();

export default function ChatPage() {
  const navigate = useNavigate();
  const selectedDateKey = useSelectedDateKey();
  const endAnchorRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [isAwaitingHistory, setIsAwaitingHistory] = useState(false);
  const [isCameraActionMenuOpen, setIsCameraActionMenuOpen] = useState(false);

  const { data, isPending: isHistoryPending } = useGetChatHistoryQuery();
  const { mutateAsync: sendMessageMutation, isPending: isSendPending } = useSendMessageMutation();
  const initMenuDraft = useMenuDraftInit();

  const chatList = useMemo(() => {
    const rawList = data?.chat_list ?? [];
    return [...rawList].sort((a, b) => {
      const aTime = parseDateValue(a.createdAt);
      const bTime = parseDateValue(b.createdAt);

      if (aTime !== null && bTime !== null && aTime !== bTime) {
        return aTime - bTime;
      }

      if (aTime === null && bTime !== null) return -1;
      if (aTime !== null && bTime === null) return 1;
      return a.id - b.id;
    });
  }, [data]);

  const hasAnyConversation = chatList.length > 0 || pendingInput !== null;
  const isTypingPending = pendingInput !== null && (isSendPending || isAwaitingHistory);
  const isInputEmpty = inputValue.trim().length === 0;
  const isQuickActionVisible = isInputEmpty && !isInputFocused;

  useEffect(() => {
    if (!isQuickActionVisible) {
      setIsCameraActionMenuOpen(false);
    }
  }, [isQuickActionVisible]);

  useEffect(() => {
    endAnchorRef.current?.scrollIntoView({
      behavior: "instant",
      block: "end",
    });
  }, [chatList]);

  useEffect(() => {
    endAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isTypingPending, pendingInput]);

  const sendChatMessage = async (rawInput: string) => {
    const text = rawInput.trim();
    if (!text || isSendPending) return;

    setPendingInput(text);
    setInputValue("");
    setIsAwaitingHistory(true);

    try {
      await sendMessageMutation({ input: text });
    } catch (error) {
      toast.warning(resolveErrorMessage(error));
      setInputValue(text);
    } finally {
      setPendingInput(null);
      setIsAwaitingHistory(false);
    }
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    await sendChatMessage(inputValue);
  };

  const handleToggleCameraActionMenu = () => {
    if (!isQuickActionVisible) {
      return;
    }

    setIsCameraActionMenuOpen((prev) => !prev);
  };

  const handleCloseCameraActionMenu = () => {
    setIsCameraActionMenuOpen(false);
  };

  const handleNavigateMenuBoardCamera = () => {
    handleCloseCameraActionMenu();
    navigate(PATH.MENU_BOARD_CAMERA, {
      state: {
        autoOpenCamera: true,
      },
    });
  };

  const handleNavigateFoodCamera = () => {
    handleCloseCameraActionMenu();
    toast.warning("음식 촬영 기능은 아직 준비 중이에요.");
    return;
    // navigate(PATH.FOOD_CAMERA, {
    //   state: {
    //     autoOpenCamera: true,
    //   },
    // });
  };

  // + 버튼의 직접 메뉴 기록하기시 draft 초기화
  const handleNavigateDirectMenuRecord = () => {
    const mealType = getMealTypeFromCurrentTime(new Date());

    initMenuDraft({
      key: formatMenuDraftKey(selectedDateKey, mealType),
      existingMenuCount: 0,
      seedMenus: [],
    });

    navigate(getMealSearchPath(selectedDateKey, mealType));
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={() => navigateBack({ fallbackTo: PATH.HOME })} />

      {isCameraActionMenuOpen ? (
        <button
          type="button"
          className={styles.floatingCameraBackdrop}
          onClick={handleCloseCameraActionMenu}
          aria-label="촬영 메뉴 닫기"
        />
      ) : null}

      <main className={styles.main}>
        {!hasAnyConversation && !isHistoryPending ? <EmptySection /> : null}
        {isHistoryPending && chatList.length === 0 && pendingInput === null ? (
          <ChatHistorySkeleton />
        ) : null}

        {hasAnyConversation ? (
          <div className={styles.chatTimeline}>
            {chatList.map((chatItem, index) => {
              const chatDate = parseDate(chatItem.createdAt);
              const previousItem = chatList[index - 1];
              const previousDate = previousItem ? parseDate(previousItem.createdAt) : null;
              const shouldShowDateDivider =
                chatDate !== null &&
                (previousDate === null || formatDateKey(chatDate) !== formatDateKey(previousDate));
              return (
                <section key={chatItem.id} className={styles.conversationSection}>
                  {shouldShowDateDivider ? (
                    <div className={styles.dateDivider}>
                      <span className={`${styles.dateText} typo-caption`}>
                        {formatDateDividerText(chatDate)}
                      </span>
                    </div>
                  ) : null}

                  <div className={styles.userMessageGroup}>
                    <p className={`${styles.timeText} typo-caption`}>
                      {formatChatTime(chatItem.createdAt)}
                    </p>
                    <p className={`${styles.userBubble} typo-body3`}>{chatItem.input_text}</p>
                  </div>

                  <div className={styles.assistantMessageGroup}>
                    <p className={`${styles.assistantBubble} typo-body3`}>
                      {chatItem.response_payload.intro_message}
                    </p>

                    {chatItem.response_payload.chat_category === "recommendation" &&
                    chatItem.response_payload.recommendations.length > 0 ? (
                      <RecommendationSection
                        chatId={chatItem.id}
                        recommendations={chatItem.response_payload.recommendations}
                      />
                    ) : null}

                    {chatItem.response_payload.chat_category === "feedback" ? (
                      <FeedbackSection
                        chatId={chatItem.id}
                        feedback={chatItem.response_payload.feedback}
                      />
                    ) : null}
                  </div>
                </section>
              );
            })}

            {pendingInput !== null ? (
              <section className={styles.conversationSection} aria-live="polite">
                <div className={styles.userMessageGroup}>
                  <p className={`${styles.timeText} typo-caption`}>{formatChatTime(new Date())}</p>
                  <p className={`${styles.userBubble} typo-body3`}>{pendingInput}</p>
                </div>

                {isTypingPending ? (
                  <div className={styles.assistantMessageGroup}>
                    <div className={styles.typingBubble} aria-label="답변 생성 중">
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                      <span className={styles.typingDot} />
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {!isInputFocused && (
          <div
            className={`${styles.floatingCameraButtonWrapper} `}
            aria-hidden={!isQuickActionVisible}
          >
            <div className={styles.floatingCameraActionContainer}>
              {isCameraActionMenuOpen ? (
                <div className={styles.floatingCameraActionList}>
                  <button
                    type="button"
                    className={styles.floatingCameraActionItem}
                    onClick={handleNavigateMenuBoardCamera}
                  >
                    <span className={`${styles.floatingCameraActionLabel} typo-label3`}>
                      메뉴판 찍기
                    </span>
                    <span className={styles.floatingCameraActionIcon}>
                      <img
                        src="/icons/menu.svg"
                        alt=""
                        aria-hidden="true"
                        className={styles.floatingCameraActionIconImage}
                      />
                    </span>
                  </button>

                  <button
                    type="button"
                    className={styles.floatingCameraActionItem}
                    onClick={handleNavigateFoodCamera}
                  >
                    <span className={`${styles.floatingCameraActionLabel} typo-label3`}>
                      음식 찍기
                    </span>
                    <span className={styles.floatingCameraActionIcon}>
                      <img
                        src="/icons/food.svg"
                        alt=""
                        aria-hidden="true"
                        className={styles.floatingCameraActionIconImage}
                      />
                    </span>
                  </button>
                </div>
              ) : null}

              {!isCameraActionMenuOpen && (
                <div className={`${styles.fabBubble} typo-caption`}>메뉴 찍기</div>
              )}
              <button
                type="button"
                className={`${styles.cameraButton}`}
                onClick={handleToggleCameraActionMenu}
                aria-label={isCameraActionMenuOpen ? "촬영 메뉴 닫기" : "촬영 메뉴 열기"}
                aria-expanded={isCameraActionMenuOpen}
              >
                {isCameraActionMenuOpen ? <X size={24} /> : <Camera size={24} />}
              </button>
            </div>
          </div>
        )}

        <div ref={endAnchorRef} />
      </main>

      <footer className={`${styles.footer} ${isInputFocused ? styles.footerKeyboardOpen : ""}`}>
        {!hasAnyConversation && (
          <section className={`${styles.chipSection}`}>
            {QUICK_CHIP_LIST.map((chip) => (
              <button
                key={chip}
                type="button"
                className={styles.chipContainer}
                onClick={() => sendChatMessage(chip)}
                disabled={isSendPending}
              >
                <p className="typo-body3">{chip}</p>
              </button>
            ))}
          </section>
        )}

        <ChatInput
          value={inputValue}
          isInputEmpty={isInputEmpty}
          isSendPending={isSendPending}
          onChange={setInputValue}
          onInputFocusChange={setIsInputFocused}
          onDirectMenuRecordClick={handleNavigateDirectMenuRecord}
          onSubmit={handleSubmit}
        />
      </footer>
    </div>
  );
}

function EmptySection() {
  return (
    <div className={styles.emptySection}>
      <img src="/icons/character-cool.svg" />
      <p className={`typo-title1 ${styles.emptyTitle}`}>
        식단 고민,
        <br />
        무엇이든 물어보세요
      </p>
      <p className={`${styles.emptyText} typo-body4`}>
        <CircleAlert size={20} />
        상황을 자세히 알려주면 추천이 더 정확해져요
      </p>
    </div>
  );
}

function ChatHistorySkeleton() {
  return (
    <SkeletonStatus className={styles.chatTimeline} label="채팅 내역을 불러오는 중입니다.">
      <section className={styles.conversationSection}>
        <div className={styles.dateDivider}>
          <Skeleton width={84} height={24} radius={999} />
        </div>

        <div className={styles.skeletonUserMessageGroup}>
          <Skeleton width={44} height={14} radius={999} />
          <Skeleton width="64%" height={38} radius={999} />
        </div>

        <div className={styles.assistantMessageGroup}>
          <div className={styles.skeletonAssistantBubble}>
            <Skeleton width="92%" height={16} radius={999} />
            <Skeleton width="68%" height={16} radius={999} />
          </div>

          <article className={styles.skeletonRecommendCard}>
            <Skeleton width={42} height={22} radius={4} />
            <Skeleton width="56%" height={24} radius={999} />
            <Skeleton width="88%" height={16} radius={999} />
            <div className={styles.skeletonRecommendMeta}>
              <Skeleton width="44%" height={16} radius={999} />
              <Skeleton width="28%" height={22} radius={999} />
            </div>
          </article>
        </div>
      </section>

      <section className={styles.conversationSection}>
        <div className={styles.skeletonUserMessageGroup}>
          <Skeleton width={44} height={14} radius={999} />
          <Skeleton width="48%" height={38} radius={999} />
        </div>
        <div className={styles.assistantMessageGroup}>
          <div className={styles.skeletonAssistantBubble}>
            <Skeleton width="84%" height={16} radius={999} />
            <Skeleton width="52%" height={16} radius={999} />
          </div>
        </div>
      </section>
    </SkeletonStatus>
  );
}

function ChatInput({
  value,
  isInputEmpty,
  isSendPending,
  onChange,
  onInputFocusChange,
  onDirectMenuRecordClick,
  onSubmit,
}: {
  value: string;
  isInputEmpty: boolean;
  isSendPending: boolean;
  onChange: (value: string) => void;
  onInputFocusChange: (isFocused: boolean) => void;
  onDirectMenuRecordClick: () => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const isSendDisabled = isInputEmpty || isSendPending;

  const handleInputChange = (nextValue: string) => {
    if (isAddActionOpen && nextValue.trim().length > 0) {
      setIsAddActionOpen(false);
    }

    onChange(nextValue);
  };

  return (
    <div className={styles.chatInputContainer}>
      <form className={styles.textInputContainer} onSubmit={onSubmit}>
        <button
          type="button"
          className={`${styles.plusIconContainer} ${isAddActionOpen ? styles.plusIconContainerActive : ""}`}
          onClick={() => setIsAddActionOpen((prev) => !prev)}
          aria-label={isAddActionOpen ? "추가 기능 닫기" : "추가 기능 열기"}
        >
          <Plus
            size={24}
            className={`${styles.plusIcon} ${isAddActionOpen ? styles.plusIconOpen : ""}`}
          />
        </button>

        <div className={styles.textInputWrapper}>
          <textarea
            rows={1}
            value={value}
            className={`${styles.textInput} typo-body3`}
            placeholder="맥도날드에 왔는데 뭐 먹을까?"
            onChange={(event) => handleInputChange(event.target.value.slice(0, 500))}
            onFocus={() => onInputFocusChange(true)}
            onBlur={() => onInputFocusChange(false)}
            maxLength={500}
            disabled={isSendPending}
          />
          {value.trim() !== "" && (
            <button
              type="submit"
              className={`${styles.sendIconContainer} ${isSendDisabled ? styles.sendIconContainerDisabled : ""}`}
              disabled={isSendDisabled}
              aria-label="메시지 전송"
            >
              <ChevronUp size={24} />
            </button>
          )}
        </div>
      </form>

      <div
        className={`${styles.addActionPanel} ${isAddActionOpen ? styles.addActionPanelVisible : styles.addActionPanelHidden}`}
        aria-hidden={!isAddActionOpen}
      >
        <button
          type="button"
          className={styles.addActionItemButton}
          onClick={onDirectMenuRecordClick}
          disabled={!isAddActionOpen}
        >
          <img src="/icons/search-icon.svg" className={styles.addActionItemIcon} />
          <span className="typo-body3">직접 메뉴 기록하기</span>
        </button>
      </div>
    </div>
  );
}

function RecommendationSection({
  chatId,
  recommendations,
}: {
  chatId: number;
  recommendations: ChatRecommendItemResponseDto[];
}) {
  const navigate = useNavigate();
  const topRecommendation = recommendations[0];
  const remaining = recommendations.slice(1);

  if (!topRecommendation) return null;

  const topBadgeText = topRecommendation.rank ? `${topRecommendation.rank}위` : "추천";

  return (
    <div className={styles.recommendationSection}>
      <article className={styles.recommendCard}>
        <span className={`${styles.rankBadge} typo-label6`}>{topBadgeText}</span>

        <div className={styles.recommendContents}>
          <p className={`${styles.recommendMenuName} typo-title2`}>{topRecommendation.menu_name}</p>
          <p className={`${styles.recommendSummary} typo-label4`}>
            {topRecommendation.one_line_summary}
          </p>
          <div className={styles.recommendMetaRow}>
            <p className={styles.menuInfoRow}>
              {topRecommendation.brand && (
                <span className={`${styles.recommendBrand} typo-label4`}>
                  {topRecommendation.brand}
                </span>
              )}
              <span className={`${styles.recommendAmount} typo-label4`}>
                1{topRecommendation.unit_quantity} ({topRecommendation.weight}
                {topRecommendation.unit === 0 ? "g" : "ml"})
              </span>
            </p>
            <span className={`${styles.recommendCalories} typo-title2`}>
              {formatCalories(topRecommendation.calories)} kcal
            </span>
          </div>
          {topRecommendation.data_source === 1 && (
            <div className={styles.dataSourceBadgeWrapper}>
              <DataSourceBadge
                variant="personal"
                // active={isSelected}
              />
            </div>
          )}

          <div className={styles.recommendAction}>
            <Button
              size="small"
              onClick={() => {
                toast.warning("식사 기록하기 기능은 아직 준비 중이에요.");
              }}
            >
              식사 기록
              <Plus size={16} className={styles.recommendActionIcon} />
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                navigate(getRecommendDetailPath(chatId, topRecommendation.menu_id));
              }}
            >
              자세히 보기
              <ChevronRight size={16} className={styles.recommendActionIcon} />
            </Button>
          </div>
        </div>
      </article>

      {remaining.length > 0 ? (
        <button
          type="button"
          className={styles.moreRecommendCard}
          aria-label="추천 목록 더보기"
          onClick={() => navigate(getRecommendResultPath(chatId))}
        >
          <p className={`${styles.moreRecommendTitle} typo-body3`}>
            상위 추천 메뉴 2~{recommendations.length}위(총 {recommendations.length}개)
          </p>
          <p className={`${styles.moreRecommendAction} typo-label3`}>
            더보기
            <ChevronRight size={20} />
          </p>
        </button>
      ) : null}
    </div>
  );
}

function FeedbackSection({ chatId, feedback }: { chatId: number; feedback: FeedbackDto }) {
  const [isMenuListOpen, setIsMenuListOpen] = useState(false);
  const primaryMenu = feedback.menus[0];
  const hasMultipleMenus = feedback.menus.length > 1;
  const navigate = useNavigate();

  return (
    <div className={styles.feedbackSection}>
      <article className={styles.feedbackCard}>
        <FeedbackScoreGauge score={feedback.score} />

        <div className={styles.feedbackContents}>
          <div className={styles.feedbackMenuSummary}>
            <p className={`${styles.feedbackMenuTitle} typo-title2`}>
              {hasMultipleMenus
                ? `${primaryMenu.menu_name} 외 ${feedback.menus.length - 1}개`
                : primaryMenu.menu_name}
            </p>

            {hasMultipleMenus ? (
              <button
                type="button"
                className={`${styles.feedbackMenuToggle}`}
                aria-expanded={isMenuListOpen}
                onClick={() => setIsMenuListOpen((prev) => !prev)}
              >
                <p className={`${styles.textAssistive} typo-label4`}>총 칼로리</p>

                <p className={`${styles.feedbackCalories} typo-title3`}>
                  {formatCalories(feedback.total_calories)} kcal
                  <ChevronUp
                    size={20}
                    className={`${styles.feedbackMenuChevron} ${
                      isMenuListOpen ? styles.feedbackMenuChevronOpen : ""
                    }`}
                  />
                </p>
              </button>
            ) : (
              <div className={`${styles.feedbackMenuToggle}`}>
                <p className={`${styles.textAlternative} typo-label4`}>
                  {formatMenuServing(primaryMenu)}
                </p>
                <p className={`${styles.feedbackCalories} typo-title3`}>
                  {formatCalories(primaryMenu.calories)} kcal
                </p>
              </div>
            )}
          </div>

          {hasMultipleMenus && isMenuListOpen ? (
            <ul className={styles.feedbackMenuList}>
              {feedback.menus.map((menu, index) => (
                <li
                  key={`${menu.menu_id}-${menu.input_menu_name}-${index}`}
                  className={styles.feedbackMenuItem}
                >
                  <div>
                    <p className={`${styles.feedbackMenuItemName} typo-body4`}>{menu.menu_name}</p>
                  </div>
                  <span className={`${styles.feedbackMenuItemCalories} typo-body4`}>
                    {formatCalories(menu.calories)} kcal
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className={styles.feedbackAction}>
            <Button
              size="small"
              fullWidth
              onClick={() => {
                toast.warning("식사 기록하기 기능은 아직 준비 중이에요.");
              }}
            >
              식사 기록
              <Plus size={16} className={styles.feedbackActionIcon} />
            </Button>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onClick={() => {
                navigate(getFeedbackResultPath(chatId));
              }}
            >
              자세히 보기
              <ChevronRight size={16} className={styles.feedbackActionIcon} />
            </Button>
          </div>
        </div>
      </article>

      <p className={`${styles.assistantBubble} typo-body3`}>{feedback.feedback_summary}</p>
      <p className={`${styles.assistantBubble} typo-body3`}>{feedback.feedback_reason}</p>
    </div>
  );
}

function FeedbackScoreGauge({ score }: { score: number }) {
  const roundedScore = Math.round(score);
  const safeScore = Math.min(Math.max(roundedScore, 0), 100);
  const characterIcon = "/icons/chat-chart-icon.svg";
  const markerPosition = getFeedbackGaugeMarkerPosition(safeScore);

  return (
    <div className={styles.feedbackScoreGauge} aria-label={`메뉴 추천도 ${safeScore}점`}>
      <div className={styles.feedbackGaugeArc}>
        <svg
          className={styles.feedbackGaugeSvg}
          viewBox={`0 0 ${FEEDBACK_GAUGE_VIEWBOX_WIDTH} ${FEEDBACK_GAUGE_VIEWBOX_HEIGHT}`}
          aria-hidden="true"
        >
          <path className={styles.feedbackGaugeTrack} d={FEEDBACK_GAUGE_PATH} pathLength={100} />
          <path
            className={styles.feedbackGaugeValue}
            d={FEEDBACK_GAUGE_PATH}
            pathLength={100}
            style={{ strokeDasharray: `${safeScore} 100` }}
          />
        </svg>
        <div className={styles.feedbackScoreLabel}>
          <p className={`${styles.feedbackScoreValue} typo-h3`}>{safeScore}점</p>
          <p className={`${styles.feedbackScoreCaption} typo-label4`}>메뉴 추천도</p>
        </div>
        <img
          src={characterIcon}
          alt=""
          aria-hidden="true"
          className={styles.feedbackGaugeCharacter}
          style={{
            left: markerPosition.x,
            top: markerPosition.y,
          }}
        />
      </div>
    </div>
  );
}

function getFeedbackGaugeMarkerPosition(score: number) {
  const angle =
    FEEDBACK_GAUGE_START_ANGLE -
    ((FEEDBACK_GAUGE_START_ANGLE - FEEDBACK_GAUGE_END_ANGLE) * score) / 100;
  const { x, y } = getFeedbackGaugePoint(angle);

  return {
    x: `${(x / FEEDBACK_GAUGE_VIEWBOX_WIDTH) * 100}%`,
    y: `${(y / FEEDBACK_GAUGE_VIEWBOX_HEIGHT) * 100}%`,
  };
}

function getFeedbackGaugePath() {
  const start = getFeedbackGaugePoint(FEEDBACK_GAUGE_START_ANGLE);
  const end = getFeedbackGaugePoint(FEEDBACK_GAUGE_END_ANGLE);

  return `M ${start.x} ${start.y} A ${FEEDBACK_GAUGE_RADIUS} ${FEEDBACK_GAUGE_RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

function getFeedbackGaugePoint(angle: number) {
  const radian = (angle * Math.PI) / 180;

  return {
    x: FEEDBACK_GAUGE_CENTER_X + FEEDBACK_GAUGE_RADIUS * Math.cos(radian),
    y: FEEDBACK_GAUGE_CENTER_Y - FEEDBACK_GAUGE_RADIUS * Math.sin(radian),
  };
}

// 문자열 날짜를 timestamp 숫자로 변환
function parseDateValue(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

// 채팅 말풍선 옆에 표시할 시간
function formatChatTime(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? parseDate(dateLike) : dateLike;
  if (!date) return "시간 미상";
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCalories(value: number) {
  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  });
}

function formatMenuServing(menu: FeedbackDto["menus"][number]) {
  return `1${menu.unit_quantity} (${formatCalories(menu.weight)}${menu.unit === 0 ? "g" : "ml"})`;
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof AppApiError && error.message.trim().length > 0) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "메시지 전송에 실패했어요. 잠시 후 다시 시도해주세요.";
}
