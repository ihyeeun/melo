import type { ReactNode } from "react";

type AssistantMessageTextProps = {
  text: string;
};

export function AssistantMessageText({ text }: AssistantMessageTextProps) {
  return <>{formatBoldText(text)}</>;
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
