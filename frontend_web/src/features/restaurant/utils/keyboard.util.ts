export function dismissKeyboard() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}
