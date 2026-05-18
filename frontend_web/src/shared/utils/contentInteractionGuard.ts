function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest("input, textarea, select")) {
    return true;
  }

  let current: Element | null = target;
  while (current) {
    if (current instanceof HTMLElement && current.isContentEditable) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function preventOutsideEditable(event: Event) {
  if (isEditableTarget(event.target)) {
    return;
  }

  event.preventDefault();
}

export const initContentInteractionGuard = () => {
  document.addEventListener("copy", preventOutsideEditable, true);
  document.addEventListener("cut", preventOutsideEditable, true);
  document.addEventListener("contextmenu", preventOutsideEditable, true);
  document.addEventListener("dragstart", preventOutsideEditable, true);
  document.addEventListener("selectstart", preventOutsideEditable, true);

  return () => {
    document.removeEventListener("copy", preventOutsideEditable, true);
    document.removeEventListener("cut", preventOutsideEditable, true);
    document.removeEventListener("contextmenu", preventOutsideEditable, true);
    document.removeEventListener("dragstart", preventOutsideEditable, true);
    document.removeEventListener("selectstart", preventOutsideEditable, true);
  };
};
