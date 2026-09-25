import { useEffect } from "react";

const ERROR_SELECTOR = '.rep-error, [role="alert"]';
const TOP_INSET = 96;
const BOTTOM_INSET = 24;

function findErrorElement(node: Node): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node.parentElement;
  if (!element) return null;
  if (element.matches(ERROR_SELECTOR)) return element;
  return (
    element.closest<HTMLElement>(ERROR_SELECTOR) ??
    element.querySelector<HTMLElement>(ERROR_SELECTOR)
  );
}

function findFirstVisibleError(root: ParentNode): HTMLElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLElement>(ERROR_SELECTOR)).find(
      (element) =>
        !element.closest('[aria-hidden="true"]') &&
        element.getClientRects().length > 0,
    ) ?? null
  );
}

export default function ScrollToError() {
  useEffect(() => {
    let animationFrame: number | null = null;
    let submitTimer: number | null = null;

    const scheduleScroll = (element: HTMLElement, force = false) => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);

      animationFrame = window.requestAnimationFrame(() => {
        if (!element.isConnected || element.closest('[aria-hidden="true"]')) return;

        const { top, bottom } = element.getBoundingClientRect();
        const isVisible =
          top >= TOP_INSET && bottom <= window.innerHeight - BOTTOM_INSET;
        if (!force && isVisible) return;

        element.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;

      if (submitTimer !== null) window.clearTimeout(submitTimer);
      submitTimer = window.setTimeout(() => {
        const errorElement =
          findFirstVisibleError(form) ?? findFirstVisibleError(document);
        if (errorElement) scheduleScroll(errorElement, true);
      }, 0);
    };

    const observer = new MutationObserver((records) => {
      let errorElement: HTMLElement | null = null;

      for (const record of records) {
        for (const node of record.addedNodes) {
          errorElement = findErrorElement(node);
          if (errorElement) break;
        }

        errorElement ??= findErrorElement(record.target);
        if (errorElement) break;
      }

      if (errorElement) scheduleScroll(errorElement);
    });

    document.addEventListener("submit", handleSubmit, true);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      observer.disconnect();
      if (submitTimer !== null) window.clearTimeout(submitTimer);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return null;
}
