import { useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import {
  companyProfileService,
  type CompanyProfileDataDto,
  type OrderResponseDto,
} from "@/api";
import { formatOrderDateTime } from "@/components/rep/repOrderUtils";
import { printThermalReceipt } from "@/utils/printDocument";
const labels = {
  Retail: "أونلاين",
  Wholesale: "جملة",
  StoreSale: "بيع محل",
} as const;
const money = (value: string | number) =>
  `₪${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function OrderReceipt({
  order,
  customerCurrentDebt,
  customerDebtLoading = false,
  customerDebtFailed = false,
}: {
  order: OrderResponseDto;
  customerCurrentDebt?: string | null;
  customerDebtLoading?: boolean;
  customerDebtFailed?: boolean;
}) {
  const [company, setCompany] = useState<CompanyProfileDataDto | null>(null);
  const [printError, setPrintError] = useState("");
  const receiptRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    companyProfileService
      .get(controller.signal)
      .then((r) => setCompany(r.company))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const print = async () => {
    const receipt = receiptRef.current;
    if (!receipt) return;
    setPrintError("");
    try {
      await printThermalReceipt(receipt, `فاتورة الطلب ${order.id}`);
    } catch {
      setPrintError("تعذر تجهيز الفاتورة للطباعة. حاول مرة أخرى.");
    }
  };
  const subtotal = Number(order.total_amount) + Number(order.order_discount);
  return (
    <>
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" disabled={customerDebtLoading} onClick={() => void print()} className="btn-outline">
          <Printer className="h-4 w-4" /> طباعة الفاتورة
        </button>
        <button
          type="button"
          disabled={customerDebtLoading}
          onClick={() => void print()}
          className="btn-outline"
          title="اختر حفظ كملف PDF من نافذة الطباعة"
        >
          <Download className="h-4 w-4" /> تحميل PDF
        </button>
      </div>
      {customerDebtLoading ? <p className="text-xs text-stone-500">جاري تحميل إجمالي الدين الحالي قبل الطباعة…</p> : null}
      {customerDebtFailed ? <p role="alert" className="text-xs font-bold text-amber-800">تعذر تحميل إجمالي الدين الحالي؛ لن يتم تخمينه من بيانات ناقصة.</p> : null}
      {printError ? <p role="alert" className="text-sm font-bold text-red-700">{printError}</p> : null}
      <section ref={receiptRef} className="receipt-print-root receipt-print-source" dir="rtl" aria-hidden="true">
        <header className="receipt-header">
          <img className="receipt-logo" src="/assets/al-fajr-logo.webp" alt="" />
          <h1>{company?.company_name || "شركة الفجر للصناعة والتجارة"}</h1>
          {company?.phones.length ? <p>{company.phones.join(" · ")}</p> : null}
          {(company?.address || company?.city) && (
            <p>{[company.address, company.city].filter(Boolean).join("، ")}</p>
          )}
        </header>
        <div className="receipt-meta">
          <ReceiptRow label="رقم الطلب" value={`#${order.id}`} />
          <ReceiptRow label="النوع" value={labels[order.order_type]} />
          <ReceiptRow
            label="التاريخ"
            value={formatOrderDateTime(order.created_at)}
          />
          <ReceiptRow label="الزبون" value={order.customer.name} />
          <ReceiptRow label="الهاتف" value={order.customer.phone} />
          {order.representative && (
            <ReceiptRow label="المندوب" value={order.representative.name} />
          )}
        </div>
        <div className="receipt-items">
          <h2>تفاصيل المنتجات</h2>
          {order.items.map((item) => {
            const discount = Number(item.product_discount);
            const finalUnit = item.is_bonus ? 0 : Number(item.unit_price);
            return (
              <article key={item.id} className="receipt-item">
                <strong>{item.variant.product.name}{item.is_bonus ? " — بونص" : ""}</strong>
                <span className="receipt-variant">
                  {item.variant.size} · {item.variant.color.name}
                </span>
                <div className="receipt-item-total">
                  <span>
                    {item.quantity} × {money(finalUnit)}
                  </span>
                  <b>{money(item.line_total)}</b>
                </div>
                {item.is_bonus ? <small>بونص — القيمة المالية صفر والكمية محسوبة من المخزون</small> : Number(item.base_unit_price) !== Number(item.unit_price) ? <small>السعر الأساسي: {money(item.base_unit_price)} · السعر الفعلي: {money(item.unit_price)}</small> : discount > 0 && (
                  <small>
                    الخصم: {" "}
                    {money(discount)}
                  </small>
                )}
              </article>
            );
          })}
        </div>
        <div className="receipt-summary">
          <ReceiptRow label="المجموع" value={money(subtotal)} />
          <ReceiptRow label="خصم الطلب" value={money(order.order_discount)} />
          <ReceiptRow
            label="الإجمالي النهائي"
            value={money(order.total_amount)}
            strong
          />
          {customerCurrentDebt != null && <ReceiptRow label="إجمالي الدين الحالي" value={money(customerCurrentDebt)} strong />}
        </div>
        <footer className="receipt-footer">شكرًا لتعاملكم معنا</footer>
      </section>
    </>
  );
}
function ReceiptRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <p className={strong ? "receipt-row receipt-row-strong" : "receipt-row"}>
      <span>{label}</span>
      <b>{value}</b>
    </p>
  );
}
