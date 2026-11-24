// 입력칸의 포커스를 풀어 키보드를 내린다
export function dismissKeyboard() {
  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}
