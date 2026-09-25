const arabicDigitPattern = /[\u0660-\u0669\u06f0-\u06f9]/g;

export function toLatinDigits(value: string): string {
  return value.replace(arabicDigitPattern, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

function normalizeNode(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    if (root.nodeValue) {
      const normalized = toLatinDigits(root.nodeValue);
      if (normalized !== root.nodeValue) root.nodeValue = normalized;
    }
    return;
  }

  if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement) {
    root.value = toLatinDigits(root.value);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue) {
      const normalized = toLatinDigits(node.nodeValue);
      if (normalized !== node.nodeValue) node.nodeValue = normalized;
    }
    node = walker.nextNode();
  }
}

export function enforceLatinDigits(root: HTMLElement): () => void {
  normalizeNode(root);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") normalizeNode(mutation.target);
      for (const node of mutation.addedNodes) normalizeNode(node);
    }
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });

  const normalizeInput = (event: Event) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
    const normalized = toLatinDigits(field.value);
    if (normalized === field.value) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    field.value = normalized;
    if (start !== null && end !== null) field.setSelectionRange(start, end);
  };

  root.addEventListener("input", normalizeInput, true);
  return () => {
    observer.disconnect();
    root.removeEventListener("input", normalizeInput, true);
  };
}
