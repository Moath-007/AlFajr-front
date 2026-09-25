import { toLatinDigits } from "./numerals";

type A4Orientation = "portrait" | "landscape";

interface PrintElementOptions {
  element: HTMLElement;
  title: string;
  orientation?: A4Orientation;
}

const CSS_PIXELS_PER_INCH = 96;
const MILLIMETERS_PER_INCH = 25.4;
const MAX_THERMAL_PAGE_HEIGHT_MM = 500;
const THERMAL_PAGE_SLACK_MM = 6;

export async function printA4Element({
  element,
  title,
  orientation = "portrait",
}: PrintElementOptions) {
  const pageSize = orientation === "landscape" ? "A4 landscape" : "A4 portrait";
  await printInFrame({
    body: createPrintableBody(element),
    title,
    width: orientation === "landscape" ? "297mm" : "210mm",
    head: collectApplicationStyles(),
    css: `
      /*
       * Chromium prints its optional date/title/URL/page-number header and
       * footer inside the @page margin. Keeping that margin at zero leaves no
       * browser margin box for those labels. The visual page margin is applied
       * to the document below instead.
       */
      @page { size: ${pageSize}; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; color: #111 !important; }
      body { width: auto !important; min-height: 0 !important; font-family: "Tajawal", Arial, sans-serif; direction: rtl; }
      [data-print-ignore], .report-print-hide, .print\\:hidden { display: none !important; }
      .print-document { position: static !important; inset: auto !important; opacity: 1 !important; visibility: visible !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 12mm !important; box-sizing: border-box !important; box-decoration-break: clone; -webkit-box-decoration-break: clone; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
      .print-only { display: block !important; }
      .print-document .hidden { display: none !important; }
      .print-document .print-active { display: block !important; }
      .print-header { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8mm; align-items: start; border-bottom: 1px solid #777; padding-bottom: 4mm; margin-bottom: 5mm; }
      .print-header-company { display: flex; align-items: center; gap: 4mm; }
      .print-header-logo { width: 28mm; height: 17mm; object-fit: contain; }
      .print-header h1, .print-header h2, .print-header p { margin: 0; }
      .print-header h1 { font-size: 18pt; line-height: 1.25; }
      .print-header h2 { margin-bottom: 2mm; font-size: 14pt; }
      .print-header p { margin-top: 1mm; font-size: 9pt; color: #444; }
      .print-meta { text-align: left; }
      .print-filter-list { display: flex !important; flex-wrap: wrap; gap: 2mm 5mm; padding: 3mm; margin: 0 0 5mm; background: #f5f5f4 !important; border: 1px solid #ddd; font-size: 9pt; }
      .print-filter-list span { white-space: nowrap; }
      .print-document section, .print-document article { box-shadow: none !important; }
      .print-document .overflow-x-auto, .print-document .report-desktop-table { display: block !important; width: 100% !important; overflow: visible !important; }
      .print-document .report-mobile-cards { display: none !important; }
      .print-document table { width: 100% !important; min-width: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; font-size: 8.5pt !important; }
      .print-document thead { display: table-header-group; }
      .print-document tfoot { display: table-footer-group; }
      .print-document th, .print-document td { padding: 2.2mm !important; border: 1px solid #bbb !important; overflow-wrap: anywhere; vertical-align: top; }
      .print-document th { background: #f0f0f0 !important; color: #111 !important; font-weight: 800; }
      .print-document tr { break-inside: avoid-page; page-break-inside: avoid; }
      .print-document h2, .print-document h3 { break-after: avoid-page; page-break-after: avoid; }
      .print-document .statement-section { margin-top: 6mm !important; }
      .print-document .statement-section > h2 { margin: 0 0 3mm !important; padding-bottom: 2mm !important; border-bottom: 1.5px solid #333 !important; font-size: 13pt !important; }
      .print-document .statement-card { margin-bottom: 3mm !important; padding: 3mm !important; border: 1px solid #bbb !important; border-radius: 0 !important; break-inside: avoid-page; page-break-inside: avoid; }
      .print-document .statement-card table { margin-top: 2mm !important; font-size: 8pt !important; }
      .print-document .print-summary { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3mm; margin-bottom: 5mm; }
      .print-document .print-summary > * { padding: 3mm !important; border: 1px solid #bbb !important; border-radius: 0 !important; break-inside: avoid-page; }
      .print-document .bg-brand { background: #fff !important; color: #162e21 !important; }
      .statement-table th:nth-child(1) { width: 16%; }
      .statement-table th:nth-child(2) { width: 28%; }
      .statement-table th:nth-child(3) { width: 12%; }
      .statement-table th:nth-child(4), .statement-table th:nth-child(5), .statement-table th:nth-child(6) { width: 14.66%; }
      @media print {
        html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    `,
  });
}

function createPrintableBody(element: HTMLElement) {
  const printableElement = element.cloneNode(true) as HTMLElement;
  printableElement
    .querySelectorAll("[data-print-ignore], .report-print-hide, .print\\:hidden")
    .forEach((ignoredElement) => ignoredElement.remove());
  return printableElement.outerHTML;
}

export async function printThermalReceipt(element: HTMLElement, title: string) {
  await printInFrame({
    body: element.outerHTML,
    title,
    width: "80mm",
    css: thermalReceiptPrintCss,
    prepare: (printDocument) => {
      const receipt = printDocument.querySelector<HTMLElement>(".receipt-print-root");
      if (!receipt) throw new Error("Receipt print root was not found.");
      const heightInPixels = Math.max(receipt.scrollHeight, receipt.getBoundingClientRect().height);
      const naturalHeightInMillimeters = Math.max(
        40,
        Math.ceil((heightInPixels * MILLIMETERS_PER_INCH) / CSS_PIXELS_PER_INCH),
      );
      const pageCount = Math.max(
        1,
        Math.ceil(
          (naturalHeightInMillimeters + THERMAL_PAGE_SLACK_MM) /
            MAX_THERMAL_PAGE_HEIGHT_MM,
        ),
      );
      const heightInMillimeters =
        Math.ceil(naturalHeightInMillimeters / pageCount) + THERMAL_PAGE_SLACK_MM;
      const pageStyle = printDocument.createElement("style");
      pageStyle.textContent = `@page { size: 80mm ${heightInMillimeters}mm; margin: 0; }`;
      printDocument.head.appendChild(pageStyle);
    },
  });
}

interface FrameOptions {
  body: string;
  title: string;
  width: string;
  css: string;
  head?: string;
  prepare?: (document: Document) => void;
}

async function printInFrame({ body, title, width, css, head = "", prepare }: FrameOptions) {
  const frame = document.createElement("iframe");
  frame.title = title;
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${width};height:1px;border:0;opacity:0;pointer-events:none`;
  document.body.appendChild(frame);

  const cleanup = () => frame.remove();
  try {
    const loaded = new Promise<void>((resolve) =>
      frame.addEventListener("load", () => resolve(), { once: true }),
    );
    frame.srcdoc = toLatinDigits(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><base href="${escapeAttribute(document.baseURI)}"><title>${escapeHtml(title)}</title>${head}<style>${css}</style></head><body>${body}</body></html>`);
    await loaded;

    const printDocument = frame.contentDocument;
    const printWindow = frame.contentWindow;
    if (!printDocument || !printWindow) throw new Error("Print frame could not be initialized.");

    await waitForPrintAssets(printDocument);
    prepare?.(printDocument);
    await nextPaint(printWindow);

    printWindow.addEventListener("afterprint", cleanup, { once: true });
    printWindow.focus();
    printWindow.print();
    window.setTimeout(cleanup, 120_000);
  } catch (error) {
    cleanup();
    throw error;
  }
}

function collectApplicationStyles() {
  return Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("");
}

async function waitForPrintAssets(printDocument: Document) {
  if (printDocument.fonts) await printDocument.fonts.ready;
  const images = Array.from(printDocument.images);
  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }
      if (typeof image.decode === "function") await image.decode().catch(() => undefined);
    }),
  );
}

function nextPaint(targetWindow: Window) {
  return new Promise<void>((resolve) =>
    targetWindow.requestAnimationFrame(() =>
      targetWindow.requestAnimationFrame(() => resolve()),
    ),
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

export const thermalReceiptPrintCss = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 80mm; min-height: 0; background: #fff; color: #111; }
  body { direction: rtl; font-family: Arial, Tahoma, sans-serif; font-size: 10.5pt; line-height: 1.4; }
  .receipt-print-root { display: block; width: 80mm; margin: 0; padding: 3mm 4mm 4mm; background: #fff; }
  .receipt-logo { display: block; width: 24mm; max-height: 16mm; margin: 0 auto 2mm; object-fit: contain; filter: grayscale(1); }
  .receipt-header { padding-bottom: 3mm; border-bottom: 1px dashed #111; text-align: center; }
  .receipt-header h1 { margin: 0 0 1.5mm; font-size: 16pt; font-weight: 900; line-height: 1.25; }
  .receipt-header p { margin: .5mm 0; font-size: 9pt; }
  .receipt-meta, .receipt-summary, .receipt-debt { padding: 3mm 0; border-bottom: 1px dashed #111; }
  .receipt-row { display: flex; justify-content: space-between; align-items: baseline; gap: 3mm; margin: 1mm 0; }
  .receipt-row span { min-width: 0; }
  .receipt-row b { flex: 1; text-align: left; overflow-wrap: anywhere; }
  .receipt-row-strong { margin-top: 1.5mm; font-size: 11.5pt; font-weight: 900; }
  .receipt-items { padding: 3mm 0; border-bottom: 1px dashed #111; }
  .receipt-items h2 { margin: 0 0 2mm; font-size: 11.5pt; font-weight: 900; }
  .receipt-item { padding: 2mm 0; border-bottom: 1px dotted #999; break-inside: avoid; page-break-inside: avoid; }
  .receipt-item:last-child { border-bottom: 0; }
  .receipt-item strong, .receipt-variant, .receipt-item small { display: block; }
  .receipt-variant { margin-top: .5mm; color: #444; font-size: 9.5pt; }
  .receipt-item-total { display: flex; justify-content: space-between; gap: 3mm; margin-top: 1.5mm; font-size: 10.5pt; }
  .receipt-item-total b { text-align: left; }
  .receipt-item small { margin-top: 1mm; color: #555; font-size: 8.5pt; }
  .receipt-debt { margin-top: 1mm; border-top: 2px solid #111; }
  .receipt-footer { padding-top: 4mm; text-align: center; font-size: 10.5pt; font-weight: 700; }
  @media print { html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
`;
