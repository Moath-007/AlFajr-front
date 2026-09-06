import { Package, Boxes, Users, ClipboardList, Clock, CheckCircle2, XCircle, TrendingUp, ArrowUpRight, Sparkles, ShoppingBag } from 'lucide-react';
import type { Product, Category, Representative, Order } from '@/types';
import { formatPrice, formatDate, getStatusLabel, getStatusBadgeClass } from '@/utils/helpers';
import { Chart } from '@/components/charts/Chart';
import EmptyState from '@/components/ui/EmptyState';

interface OwnerDashboardProps {
  products: Product[];
  categories: Category[];
  reps: Representative[];
  orders: Order[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function OwnerDashboard({ products, categories, reps, orders, onNavigate }: OwnerDashboardProps) {
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');
  const totalValue = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: 'إجمالي المنتجات', value: products.length, icon: Package, color: 'bg-brand text-amber-400', border: 'border-brand/10' },
    { label: 'إجمالي التصنيفات', value: categories.length, icon: Boxes, color: 'bg-amber-500 text-stone-950', border: 'border-amber-500/10' },
    { label: 'عدد المناديب', value: reps.length, icon: Users, color: 'bg-blue-600 text-white', border: 'border-blue-500/10' },
    { label: 'إجمالي الطلبات', value: orders.length, icon: ClipboardList, color: 'bg-purple-600 text-white', border: 'border-purple-500/10' },
    { label: 'الطلبات المعلقة', value: pendingOrders.length, icon: Clock, color: 'bg-amber-600 text-white', border: 'border-amber-600/10' },
    { label: 'الطلبات المكتملة', value: completedOrders.length, icon: CheckCircle2, color: 'bg-emerald-600 text-white', border: 'border-emerald-500/10' },
    { label: 'الطلبات الملغاة', value: cancelledOrders.length, icon: XCircle, color: 'bg-rose-600 text-white', border: 'border-rose-500/10' },
    { label: 'إجمالي قيمة الطلبات', value: formatPrice(totalValue), icon: TrendingUp, color: 'bg-teal-600 text-white', border: 'border-teal-500/10' },
  ];

  // Orders over time (last 7 entries by date)
  const ordersByDate = (() => {
    const map = new Map<string, number>();
    [...orders].reverse().forEach((o) => {
      const d = o.createdAt.slice(0, 10);
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).slice(-7).map(([date, count]) => ({ label: formatDate(date), value: count }));
  })();

  // Orders by status
  const ordersByStatus = [
    { label: 'قيد الانتظار', value: pendingOrders.length, color: '#d97706' },
    { label: 'مكتمل', value: completedOrders.length, color: '#162E21' },
    { label: 'ملغي', value: cancelledOrders.length, color: '#e11d48' },
  ];

  // Most requested products
  const productCount = new Map<string, { name: string; count: number }>();
  orders.forEach((o) => {
    o.items.forEach((item) => {
      const existing = productCount.get(item.productId);
      if (existing) existing.count += item.quantity;
      else productCount.set(item.productId, { name: item.productName, count: item.quantity });
    });
  });
  const topProducts = Array.from(productCount.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCount = topProducts[0]?.count || 1;

  const recentOrders = [...orders].slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* رأس لوحة التحكم الترحيبي الفخم */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-700 to-stone-900 p-8 rounded-3xl text-white shadow-xl">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              <span>لوحة تحكم الإدارة العليا</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">أهلاً بك، صاحب المحل</h1>
            <p className="text-stone-300 text-sm sm:text-base max-w-xl leading-relaxed">
              إليك نظرة شاملة ومحدثة على حركة المبيعات، أداء المناديب، وإحصائيات المخزون لشركة الفجر.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="h-12 w-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-stone-300 font-medium">إجمالي المبيعات النشطة</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">{formatPrice(totalValue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* بطاقات الإحصائيات (Stats Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div 
            key={i} 
            className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color} shadow-sm group-hover:scale-110 transition-transform`}>
                <s.icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-stone-400 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100">
                مؤشر نشط
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">{s.value}</div>
            <div className="text-xs font-bold text-stone-400 mt-1.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* قسم الرسوم البيانية */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-stone-900 text-lg">الطلبات خلال الفترة الأخيرة</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              حركة يومية
            </span>
          </div>
          <div className="pt-2">
            <Chart type="bar" data={ordersByDate} color="#162E21" />
          </div>
        </div>
        
        <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-stone-900 text-lg">توزيع الطلبات حسب الحالة</h3>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
              نسب مئوية
            </span>
          </div>
          <div className="pt-2">
            <Chart type="donut" data={ordersByStatus} />
          </div>
        </div>
      </div>

      {/* المنتجات الأكثر طلباً ومبيعات الحالات */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* المنتجات الأكثر طلباً */}
        <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-stone-900 text-lg">المنتجات الأكثر طلباً</h3>
              <span className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                الأعلى مبيعاً
              </span>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-12">
                <EmptyState title="لا توجد بيانات" description="لم يتم تسجيل طلبات بعد" />
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((p, i) => (
                  <div key={i} className="bg-stone-50/80 p-4 rounded-2xl border border-stone-100/80">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-stone-800 truncate max-w-[65%]">{p.name}</span>
                      <span className="text-amber-600 font-black bg-amber-500/10 px-3 py-0.5 rounded-xl text-xs">
                        {p.count} وحدة
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-stone-200/80 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-l from-amber-500 to-amber-600 transition-all duration-700" 
                        style={{ width: `${(p.count / maxCount) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* قيمة المبيعات حسب الحالة */}
        <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-stone-900 text-lg">قيمة المبيعات حسب الحالة</h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
              بالعملة المحلية
            </span>
          </div>
          <div className="pt-2">
            <Chart
              type="bar"
              data={[
                { label: 'قيد الانتظار', value: pendingOrders.reduce((s, o) => s + o.total, 0) },
                { label: 'مكتمل', value: completedOrders.reduce((s, o) => s + o.total, 0) },
                { label: 'ملغي', value: cancelledOrders.reduce((s, o) => s + o.total, 0) },
              ]}
              color="#d97706"
            />
          </div>
        </div>

      </div>

      {/* جدول آخر الطلبات */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-7 border-b border-stone-100">
          <div>
            <h3 className="font-black text-stone-900 text-lg">آخر الطلبات المسجلة</h3>
            <p className="text-xs text-stone-400 mt-0.5">سجل أحدث الطلبات الواردة من المناديب والزبائن</p>
          </div>
          <button 
            onClick={() => onNavigate('orders')} 
            className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/70 px-4 py-2 rounded-xl transition-colors"
          >
            <span>عرض كل الطلبات</span>
            <ArrowUpRight className="h-4 w-4 rtl:rotate-90" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12">
            <EmptyState title="لا توجد طلبات" description="لم يتم استلام أي طلبات جديدة حتى الآن." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50/80 text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 text-right font-bold">رقم الطلب</th>
                  <th className="px-6 py-4 text-right font-bold">المندوب</th>
                  <th className="px-6 py-4 text-right font-bold">الزبون</th>
                  <th className="px-6 py-4 text-right font-bold">التاريخ</th>
                  <th className="px-6 py-4 text-right font-bold">الإجمالي</th>
                  <th className="px-6 py-4 text-right font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentOrders.map((o) => (
                  <tr 
                    key={o.id} 
                    className="hover:bg-stone-50/80 transition-colors cursor-pointer group" 
                    onClick={() => onNavigate('orders', { id: o.id })}
                  >
                    <td className="px-6 py-4 font-black text-brand group-hover:text-amber-600 transition-colors">
                      #{o.number}
                    </td>
                    <td className="px-6 py-4 text-stone-700 font-semibold">{o.repName}</td>
                    <td className="px-6 py-4 text-stone-700 font-medium">{o.customerName}</td>
                    <td className="px-6 py-4 text-stone-400 text-xs font-medium">{formatDate(o.createdAt)}</td>
                    <td className="px-6 py-4 font-black text-amber-600">{formatPrice(o.total)}</td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClass(o.status)}>{getStatusLabel(o.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}