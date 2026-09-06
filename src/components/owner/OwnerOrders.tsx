import { useState, useMemo } from 'react';
import { Search, Eye, ClipboardList, ShoppingBag, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Order, Representative, OrderStatus } from '@/types';
import { formatPrice, formatDate, formatDateTime, getStatusLabel, getStatusBadgeClass } from '@/utils/helpers';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

interface OwnerOrdersProps {
  orders: Order[];
  reps: Representative[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialOrderId?: string;
}

export default function OwnerOrders({ orders, reps, onUpdateStatus, onNotify, initialOrderId }: OwnerOrdersProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // عدد الطلبات في كل صفحة

  const [viewing, setViewing] = useState<Order | null>(null);

  useMemo(() => {
    if (initialOrderId) {
      const order = orders.find((o) => o.id === initialOrderId);
      if (order) setViewing(order);
    }
  }, [initialOrderId, orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search) {
        if (!o.number.includes(search) && !o.customerName.includes(search) && !o.customerPhone.includes(search)) return false;
      }
      if (statusFilter && o.status !== statusFilter) return false;
      if (repFilter && o.repId !== repFilter) return false;
      return true;
    });
  }, [orders, search, statusFilter, repFilter]);

  // حساب الطلبات الخاصة بالصفحة الحالية
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // إعادة الصفحة إلى 1 عند تغيير البحث أو الفلاتر
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleRepFilterChange = (val: string) => {
    setRepFilter(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (order: Order, status: OrderStatus) => {
    onUpdateStatus(order.id, status);
    onNotify('تم تحديث حالة الطلب');
    setViewing({ ...order, status });
  };

  return (
      <div className="space-y-8 animate-fade-in pb-28"> {/* مساحة إضافية للشريط العائم */}

        {/* رأس الصفحة الفخم */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold mb-2 border border-amber-500/20">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>متابعة المبيعات</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">إدارة الطلبات</h1>
            <p className="text-stone-500 mt-1 text-sm font-medium">عرض ومتابعة كافة طلبات الزبائن ({filtered.length} طلب مطابق)</p>
          </div>
        </div>

        {/* شريط البحث والفلاتر */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ابحث برقم الطلب أو اسم/هاتف الزبون..."
                className="input w-full pr-12 pl-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-brand text-sm font-medium bg-stone-50/50 focus:bg-white transition-all"
            />
          </div>

          <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="input sm:w-48 px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-brand text-sm font-bold bg-stone-50/50 focus:bg-white transition-all text-stone-700"
          >
            <option value="">كل الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>

          <select
              value={repFilter}
              onChange={(e) => handleRepFilterChange(e.target.value)}
              className="input sm:w-48 px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-brand text-sm font-bold bg-stone-50/50 focus:bg-white transition-all text-stone-700"
          >
            <option value="">كل المناديب</option>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* عرض الجدول أو حالة الفراغ */}
        {filtered.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200/80 shadow-xs">
              <EmptyState
                  icon={<ClipboardList className="h-10 w-10 text-amber-600" />}
                  title="لا توجد طلبات مطابقة"
                  description="لم يتم العثور على طلبات تطابق خيارات البحث أو الفلترة الحالية."
              />
            </div>
        ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50/80 text-stone-400 text-xs border-b border-stone-100">
                    <tr>
                      <th className="px-5 py-4 text-right font-bold">رقم الطلب</th>
                      <th className="px-5 py-4 text-right font-bold">اسم الزبون</th>
                      <th className="px-5 py-4 text-right font-bold">المندوب</th>
                      <th className="px-5 py-4 text-right font-bold">التاريخ</th>
                      <th className="px-5 py-4 text-right font-bold">عدد المنتجات</th>
                      <th className="px-5 py-4 text-right font-bold">الإجمالي</th>
                      <th className="px-5 py-4 text-right font-bold">الحالة</th>
                      <th className="px-5 py-4 text-center font-bold">الإجراءات</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50 font-medium">
                    {paginatedOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="px-5 py-4 font-black text-brand">#{o.number}</td>
                          <td className="px-5 py-4 text-stone-800 font-bold">{o.customerName}</td>
                          <td className="px-5 py-4 text-stone-600">{o.repName}</td>
                          <td className="px-5 py-4 text-stone-400 text-xs">{formatDate(o.createdAt)}</td>
                          <td className="px-5 py-4 text-stone-600">{o.items.length} منتجات</td>
                          <td className="px-5 py-4 font-black text-amber-600">{formatPrice(o.total)}</td>
                          <td className="px-5 py-4"><span className={getStatusBadgeClass(o.status)}>{getStatusLabel(o.status)}</span></td>
                          <td className="px-5 py-4 text-center">
                            <button
                                onClick={() => setViewing(o)}
                                className="inline-flex items-center justify-center p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors shadow-2xs"
                                title="عرض التفاصيل"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* نظام ترقيم الصفحات العائم (Floating Pagination) */}
              {totalPages > 1 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-md">
                    <div className="flex items-center justify-between bg-stone-900/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl text-white">
                      <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span>السابق</span>
                      </button>

                      <div className="text-xs font-extrabold tracking-wide">
                        صفحة <span className="text-amber-400">{currentPage}</span> من <span className="text-stone-300">{totalPages}</span>
                      </div>

                      <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>التالي</span>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
              )}
            </div>
        )}

        {/* نافذة تفاصيل الطلب الفخمة */}
        <Modal
            open={!!viewing}
            onClose={() => setViewing(null)}
            title={`تفاصيل الطلب #${viewing?.number || ''}`}
            size="lg"
        >
          {viewing && (
              <div className="space-y-6 pt-2">

                {/* معلومات العميل والطلب */}
                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/60">
                    <div className="text-xs font-bold text-stone-400 mb-1">الزبون</div>
                    <div className="font-black text-stone-900 text-base">{viewing.customerName}</div>
                  </div>
                  <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/60">
                    <div className="text-xs font-bold text-stone-400 mb-1">الهاتف</div>
                    <div className="font-black text-stone-900 text-base" dir="ltr">{viewing.customerPhone}</div>
                  </div>
                  <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/60 sm:col-span-2">
                    <div className="text-xs font-bold text-stone-400 mb-1">العنوان</div>
                    <div className="font-bold text-stone-800">{viewing.customerAddress}</div>
                  </div>
                  <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/60">
                    <div className="text-xs font-bold text-stone-400 mb-1">المندوب المسؤول</div>
                    <div className="font-bold text-stone-800">{viewing.repName}</div>
                  </div>
                  <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/60">
                    <div className="text-xs font-bold text-stone-400 mb-1">تاريخ ووقت الطلب</div>
                    <div className="font-bold text-stone-800">{formatDateTime(viewing.createdAt)}</div>
                  </div>
                  {viewing.notes && (
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 sm:col-span-2">
                        <div className="text-xs font-bold text-amber-700 mb-1">ملاحظات خاصة</div>
                        <div className="text-stone-700 font-medium">{viewing.notes}</div>
                      </div>
                  )}
                </div>

                {/* جدول المنتجات داخل الطلب */}
                <div className="border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-400 text-xs border-b border-stone-100">
                    <tr>
                      <th className="px-4 py-3 text-right font-bold">المنتج</th>
                      <th className="px-4 py-3 text-right font-bold">المقاس</th>
                      <th className="px-4 py-3 text-right font-bold">اللون</th>
                      <th className="px-4 py-3 text-right font-bold">الكمية</th>
                      <th className="px-4 py-3 text-right font-bold">سعر الوحدة</th>
                      <th className="px-4 py-3 text-right font-bold">الإجمالي</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50 font-medium">
                    {viewing.items.map((item, i) => (
                        <tr key={i} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3 font-bold text-stone-900">
                            {item.productName} <span className="text-xs text-stone-400 font-normal">({item.productCode})</span>
                          </td>
                          <td className="px-4 py-3 text-stone-600">{item.size}</td>
                          <td className="px-4 py-3 text-stone-600">{item.color}</td>
                          <td className="px-4 py-3 text-stone-600 font-bold">{item.quantity}</td>
                          <td className="px-4 py-3 text-stone-600">{formatPrice(item.unitPrice)}</td>
                          <td className="px-4 py-3 font-black text-amber-600">{formatPrice(item.total)}</td>
                        </tr>
                    ))}
                    </tbody>
                    <tfoot className="bg-stone-50/80 border-t border-stone-100">
                    <tr>
                      <td colSpan={5} className="px-4 py-3.5 text-left font-black text-stone-900">إجمالي الطلب الكلي:</td>
                      <td className="px-4 py-3.5 text-lg font-black text-amber-600">{formatPrice(viewing.total)}</td>
                    </tr>
                    </tfoot>
                  </table>
                </div>

                {/* تحكم حالة الطلب */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-500">الحالة الحالية:</span>
                    <span className={getStatusBadgeClass(viewing.status)}>{getStatusLabel(viewing.status)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                        onClick={() => handleStatusChange(viewing, 'pending')}
                        disabled={viewing.status === 'pending'}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      قيد الانتظار
                    </button>
                    <button
                        onClick={() => handleStatusChange(viewing, 'completed')}
                        disabled={viewing.status === 'completed'}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                    >
                      مكتمل
                    </button>
                    <button
                        onClick={() => handleStatusChange(viewing, 'cancelled')}
                        disabled={viewing.status === 'cancelled'}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                    >
                      ملغي
                    </button>
                  </div>
                </div>

              </div>
          )}
        </Modal>
      </div>
  );
}