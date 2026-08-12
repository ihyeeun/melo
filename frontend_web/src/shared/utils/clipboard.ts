function copyTextWithLegacyCommand(text: string) {
  if (typeof document === "undefined" || !document.body) {
    throw new Error("클립보드를 사용할 수 없는 환경입니다.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    if (!document.execCommand("copy")) {
      throw new Error("클립보드 복사 명령이 거부되었습니다.");
    }
  } finally {
    textarea.remove();
  }
}

export async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 일부 인앱 WebView는 Clipboard API를 노출하지만 쓰기 권한을 거부할 수 있습니다.
    }
  }

  copyTextWithLegacyCommand(text);
}
