import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  accountsService,
  returnsService,
  type AccountFinancialDocument,
  type PurchaseReturnDto,
} from '@/api';
import { useAuth } from '@/auth/useAuth';
import { apiMessages, formatOrderDate } from '@/components/rep/repOrderUtils';
import PaymentDetailsModal from './PaymentDetailsModal';
import { DocumentSummary } from './AccountFinancialPanels';
import StatementSourceDetailsView from './StatementSourceDetails';
export default function AccountSourcePage() {
  const { kind, id } = useParams();
  const sourceId = Number(id);
  const { user } = useAuth();
  const base = user?.role === 'Admin' ? '/owner' : '/rep';
  const [discount, setDiscount] = useState<AccountFinancialDocument | null>(
    null,
  );
  const [purchaseReturn, setPurchaseReturn] =
    useState<PurchaseReturnDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(kind !== 'Payment');
  useEffect(() => {
    const c = new AbortController();
    setDiscount(null);
    setPurchaseReturn(null);
    setError('');
    if (kind === 'Payment') {
      setLoading(false);
      return () => c.abort();
    }
    setLoading(true);
    const load = async () => {
      if (kind === 'Discount')
        setDiscount(await accountsService.discount(sourceId, c.signal));
      else if (kind === 'PurchaseReturn') {
        const rows = await returnsService.listPurchase();
        if (c.signal.aborted) return;
        const r = rows.find((r) => r.customer_return_id === sourceId);
        if (!r) throw new Error('missing');
        setPurchaseReturn(r);
      } else throw new Error('unsupported');
    };
    load()
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, 'المصدر غير موجود أو غير متاح.').join('، '));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [kind, sourceId]);
  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <Link className="text-sm text-stone-500" to={`${base}/accounts`}>
        الحسابات
      </Link>
      <h1 className="text-2xl font-bold text-brand">
        {kind === 'Discount'
          ? 'خصم على الحساب'
          : kind === 'PurchaseReturn'
            ? 'مردود مشتريات'
            : 'تفاصيل السند'}{' '}
        #{sourceId}
      </h1>
      {error && (
        <p className="rep-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">جارٍ تحميل المصدر…</p>}
      {discount && (
        <section className="space-y-4 rounded-2xl border bg-white p-5">
          <DocumentSummary document={discount} />
          <p className="text-xs text-stone-500">
            أُنشئ {formatOrderDate(discount.created_at)}
          </p>
          <Link
            className="btn-outline inline-block"
            to={`${base}/accounts/${discount.account_id}`}
          >
            تفاصيل الحساب وإدارة الخصومات
          </Link>
        </section>
      )}
      {purchaseReturn && (
        <>
          {purchaseReturn.account_id !== null && (
            <Link
              className="text-brand underline"
              to={`${base}/accounts/${purchaseReturn.account_id}`}
            >
              {purchaseReturn.account?.name ?? 'تفاصيل الحساب'}
            </Link>
          )}
          <StatementSourceDetailsView
            details={{
              kind: 'Return',
              reference_id: sourceId,
              is_reversal: false,
              return_type: 'PurchaseReturn',
              cancelled: !!purchaseReturn.cancelled_at,
              total: purchaseReturn.total_amount,
              purchase_id: purchaseReturn.customer_purchase_id,
              notes: purchaseReturn.notes,
              items: purchaseReturn.items.map((i) => ({
                product_name: i.product_variants.products.name,
                product_code: i.product_variants.products.code,
                size: i.product_variants.size,
                color: i.product_variants.colors.name,
                quantity: i.quantity,
                unit_price: i.unit_price,
                line_total: (Number(i.quantity) * Number(i.unit_price)).toFixed(
                  2,
                ),
              })),
            }}
          />
        </>
      )}
      {kind === 'Payment' && (
        <PaymentDetailsModal
          paymentId={sourceId}
          onClose={() => window.close()}
        />
      )}
    </div>
  );
}
