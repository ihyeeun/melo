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

export function AssistantMessageText({
  animatedTailClassName,
  isStreaming = false,
  text,
}: AssistantMessageTextProps) {
  const { animatedText, stableText } = getAssistantMessageTextParts(text, isStreaming);

  if (!animatedText) {
    return <>{formatBoldText(text)}</>;
  }

  return (
    <>
      {formatBoldText(stableText)}
      <span key={text} className={animatedTailClassName}>
        {formatBoldText(animatedText)}
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

  const animatedTextMatch = text.match(/\S+\s*$/);
  const splitIndex = animatedTextMatch?.index ?? 0;
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

function hasBalancedBoldMarkers(text: string) {
  return (text.match(/\*\*/g)?.length ?? 0) % 2 === 0;
}

function formatBoldText(text: string): ReactNode[] {
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
