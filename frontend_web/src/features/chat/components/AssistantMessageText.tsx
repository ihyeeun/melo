import type { ReactNode } from "react";

type AssistantMessageTextProps = {
  animatedTailClassName?: string;
  isStreaming?: boolean;
  text: string;
};

type AssistantMessageTextParts = {
  animatedText: string;
  stableText: string;
};

const STREAMING_TAIL_CHARACTER_COUNT = 4;

export function AssistantMessageText({
  animatedTailClassName,
  isStreaming = false,
  text,
}: AssistantMessageTextProps) {
  const { animatedText, stableText } = getAssistantMessageTextParts(text, isStreaming);
  const shouldRenderOpenBold = isStreaming;

  if (!animatedText) {
    return <>{formatBoldText(text, { shouldRenderOpenBold })}</>;
  }

  return (
    <>
      {formatBoldText(stableText, { shouldRenderOpenBold })}
      <span key={`${text.length}:${animatedText}`} className={animatedTailClassName}>
        {formatBoldText(animatedText, { shouldRenderOpenBold })}
      </span>
    </>
  );
}

function getAssistantMessageTextParts(text: string, isStreaming: boolean): AssistantMessageTextParts {
  if (!isStreaming || text.length === 0) {
    return {
      animatedText: "",
      stableText: text,
    };
  }

  const splitIndex = getStreamingTailSplitIndex(text);
  const stableText = text.slice(0, splitIndex);
  const animatedText = text.slice(splitIndex);

  if (!animatedText || animatedText.includes("**") || !hasBalancedBoldMarkers(stableText)) {
    return {
      animatedText: "",
      stableText: text,
    };
  }

  return {
    animatedText,
    stableText,
  };
}

function getStreamingTailSplitIndex(text: string) {
  const trailingWhitespace = text.match(/\s*$/)?.[0] ?? "";
  const visibleTextLength = text.length - trailingWhitespace.length;
  const visibleCharacters = Array.from(text.slice(0, visibleTextLength));
  const tailCharacterCount = Math.min(STREAMING_TAIL_CHARACTER_COUNT, visibleCharacters.length);

  if (tailCharacterCount === 0) {
    return 0;
  }

  return visibleCharacters.slice(0, -tailCharacterCount).join("").length;
}

function hasBalancedBoldMarkers(text: string) {
  return (text.match(/\*\*/g)?.length ?? 0) % 2 === 0;
}

function formatBoldText(
  text: string,
  options: { shouldRenderOpenBold?: boolean } = {},
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let nodeIndex = 0;

  while (cursor < text.length) {
    const startIndex = text.indexOf("**", cursor);

    if (startIndex === -1) {
      nodes.push(text.slice(cursor));
      break;
    }

    const endIndex = text.indexOf("**", startIndex + 2);

    if (endIndex === -1) {
      if (options.shouldRenderOpenBold) {
        if (startIndex > cursor) {
          nodes.push(text.slice(cursor, startIndex));
        }

        const boldText = text.slice(startIndex + 2);

        if (boldText.length === 0) {
          nodes.push(text.slice(startIndex));
        } else {
          nodes.push(<strong key={nodeIndex}>{boldText}</strong>);
        }

        break;
      }

      nodes.push(text.slice(cursor));
      break;
    }

    if (startIndex > cursor) {
      nodes.push(text.slice(cursor, startIndex));
    }

    const boldText = text.slice(startIndex + 2, endIndex);

    if (boldText.length === 0) {
      nodes.push(text.slice(startIndex, endIndex + 2));
    } else {
      nodes.push(<strong key={nodeIndex}>{boldText}</strong>);
      nodeIndex += 1;
    }

    cursor = endIndex + 2;
  }

  return nodes;
}
