import { ClipboardList, Clock, CheckCircle2, XCircle, Plus, Eye, ArrowLeft, Sparkles } from 'lucide-react';
import type { Order, Representative } from '@/types';
import { formatPrice, formatDate, getStatusLabel, getStatusBadgeClass } from '@/utils/helpers';
import EmptyState from '@/components/ui/EmptyState';

interface RepDashboardProps {
  orders: Order[];
  rep: Representative;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function RepDashboard({ orders, rep, onNavigate }: RepDashboardProps) {
  const myOrders = orders.filter((o) => o.repId === rep.id);
  const pending = myOrders.filter((o) => o.status === 'pending');
  const completed = myOrders.filter((o) => o.status === 'completed');
  const cancelled = myOrders.filter((o) => o.status === 'cancelled');
  const totalRevenue = completed.reduce((s, o) => s + o.total, 0);

  const stats = [
    { label: 'إجمالي طلباتي', value: myOrders.length, icon: ClipboardList, color: 'bg-emerald-950 text-amber-400 border border-emerald-900/60' },
    { label: 'الطلبات المعلقة', value: pending.length, icon: Clock, color: 'bg-amber-500 text-stone-950 shadow-amber-500/20' },
    { label: 'الطلبات المكتملة', value: completed.length, icon: CheckCircle2, color: 'bg-emerald-600 text-white shadow-emerald-600/20' },
    { label: 'الطلبات الملغاة', value: cancelled.length, icon: XCircle, color: 'bg-rose-600 text-white shadow-rose-600/20' },
  ];

  return (
      <div className="space-y-8 animate-fade-in pb-16">

        {/* رأس الصفحة الفخم المتناسق مع السايدبار */}
        <div className="bg-emerald-950 p-6 sm:p-8 rounded-3xl border border-emerald-900 shadow-xl text-white flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute left-0 bottom-0 translate-x-8 translate-y-8 opacity-5 pointer-events-none">
            <Sparkles className="h-64 w-64 text-amber-400" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 text-amber-400 text-xs font-black mb-2.5 border border-emerald-800/80 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>لوحة التحكم الشخصية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">مرحباً، {rep.name}</h1>
            <p className="text-emerald-200/80 mt-1 text-sm font-medium">إليك نظرة سريعة ومحدثة على طلباتك وأدائك اليوم</p>
          </div>

          <button
              onClick={() => onNavigate('create-order')}
              className="relative z-10 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black !py-3.5 !px-6 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform"
          >
            <Plus className="h-5 w-5" />
            <span>إنشاء طلب جديد</span>
          </button>
        </div>

        {/* بطاقات الإحصائيات المتناسقة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-emerald-950/10 shadow-xs hover:shadow-md transition-all group">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color} mb-4 shadow-sm group-hover:scale-105 transition-transform`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="text-2xl font-black text-emerald-950 tracking-tight">{s.value}</div>
                <div className="text-xs font-bold text-stone-400 mt-1">{s.label}</div>
              </div>
          ))}
        </div>

        {/* بطاقة إجمالي المبيعات المكتملة الفخمة */}
        <div className="bg-gradient-to-l from-emerald-950 via-emerald-900 to-emerald-950 p-6 sm:p-8 rounded-3xl border border-emerald-900 shadow-xl text-white relative overflow-hidden">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <CheckCircle2 className="h-44 w-44 text-amber-400" />
          </div>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>إجمالي مبيعاتك المكتملة</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white mt-2 tracking-tight">{formatPrice(totalRevenue)}</div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
              <CheckCircle2 className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* الطلبات الأخيرة */}
        <div className="bg-white rounded-3xl border border-emerald-950/10 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-6 sm:p-7 border-b border-stone-100">
            <h3 className="font-black text-emerald-950 text-base">طلباتي الأخيرة</h3>
            <button
                onClick={() => onNavigate('my-orders')}
                className="text-xs font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 transition-colors"
            >
              <span>عرض الكل</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          {myOrders.length === 0 ? (
              <div className="p-12">
                <EmptyState
                    icon={<ClipboardList className="h-10 w-10 text-emerald-700" />}
                    title="لا توجد طلبات بعد"
                    description="ابدأ بإنشاء طلب جديد لمتابعة عملك"
                    action={
                      <button onClick={() => onNavigate('create-order')} className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black !py-3 !px-5 rounded-2xl flex items-center gap-2 shadow-sm">
                        <Plus className="h-4 w-4" />
                        <span>إنشاء طلب</span>
                      </button>
                    }
                />
              </div>
          ) : (
              <div className="divide-y divide-emerald-50/60">
                {myOrders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-5 hover:bg-emerald-50/30 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-950 text-amber-400 font-black text-xs shadow-xs border border-emerald-900">
                          #{o.number}
                        </div>
                        <div>
                          <div className="font-black text-emerald-950 text-sm mb-0.5">{o.customerName}</div>
                          <div className="text-xs font-medium text-stone-400">{formatDate(o.createdAt)} • {o.items.length} منتج</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mr-auto sm:mr-0">
                        <span className="font-black text-emerald-900 text-sm">{formatPrice(o.total)}</span>
                        <span className={getStatusBadgeClass(o.status)}>{getStatusLabel(o.status)}</span>
                        <button
                            onClick={() => onNavigate('my-orders', { id: o.id })}
                            className="p-2.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-2xs border border-emerald-200/50"
                            title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                ))}
              </div>
          )}
        </div>

      </div>
  );
}