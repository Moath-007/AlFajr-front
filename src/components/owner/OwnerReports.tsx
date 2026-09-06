import type { Product, Category, Representative, Order } from '@/types';
import { formatPrice } from '@/utils/helpers';
import { Chart } from '@/components/charts/Chart';
import { TrendingUp, ShoppingCart, Users, DollarSign, BarChart3, Award } from 'lucide-react';

interface OwnerReportsProps {
  products: Product[];
  categories: Category[];
  reps: Representative[];
  orders: Order[];
}

export default function OwnerReports({ products, categories, reps, orders }: OwnerReportsProps) {
  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalRevenue = validOrders.reduce((s, o) => s + o.total, 0);
  const avgOrderValue = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

  // Sales by rep
  const salesByRep = reps.map((r) => {
    const repOrders = validOrders.filter((o) => o.repId === r.id);
    return { label: r.name, value: repOrders.reduce((s, o) => s + o.total, 0) };
  }).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

  // Sales by category
  const salesByCategory = categories.map((c) => {
    let total = 0;
    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product && product.categoryId === c.id) total += item.total;
      });
    });
    return { label: c.name, value: total };
  }).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

  // Top products by revenue
  const productRevenue = new Map<string, { name: string; revenue: number; qty: number }>();
  validOrders.forEach((o) => {
    o.items.forEach((item) => {
      const existing = productRevenue.get(item.productId);
      if (existing) {
        existing.revenue += item.total;
        existing.qty += item.quantity;
      } else {
        productRevenue.set(item.productId, { name: item.productName, revenue: item.total, qty: item.quantity });
      }
    });
  });
  const topProducts = Array.from(productRevenue.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
      <div className="space-y-8 animate-fade-in pb-16">

        {/* رأس الصفحة الفخم */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold mb-2 border border-amber-500/20">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>التحليلات والإحصائيات</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">التقارير</h1>
            <p className="text-stone-500 mt-1 text-sm font-medium">تحليل أداء المتجر والمبيعات بدقة عالية</p>
          </div>
        </div>

        {/* بطاقات الملخص الإحصائي الفاخرة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي المبيعات', value: formatPrice(totalRevenue), icon: DollarSign, color: 'bg-emerald-600' },
            { label: 'متوسط قيمة الطلب', value: formatPrice(avgOrderValue), icon: TrendingUp, color: 'bg-amber-500' },
            { label: 'إجمالي الطلبات', value: orders.length, icon: ShoppingCart, color: 'bg-stone-900' },
            { label: 'عدد المناديب النشطين', value: reps.filter((r) => r.active).length, icon: Users, color: 'bg-blue-600' },
          ].map((s, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color} text-white mb-4 shadow-xs`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="text-2xl font-black text-stone-900 tracking-tight">{s.value}</div>
                <div className="text-xs font-bold text-stone-400 mt-1">{s.label}</div>
              </div>
          ))}
        </div>

        {/* الرسوم البيانية */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200/80 shadow-xs">
            <h3 className="font-black text-stone-900 text-base mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              المبيعات حسب المندوب
            </h3>
            {salesByRep.length > 0 ? (
                <Chart type="bar" data={salesByRep} color="#9C7537" />
            ) : (
                <div className="text-sm text-stone-400 text-center py-16 font-medium">لا توجد بيانات مبيعات للمناديب حالياً</div>
            )}
          </div>

          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200/80 shadow-xs">
            <h3 className="font-black text-stone-900 text-base mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-stone-900"></span>
              المبيعات حسب التصنيف
            </h3>
            {salesByCategory.length > 0 ? (
                <Chart type="bar" data={salesByCategory} color="#162E21" />
            ) : (
                <div className="text-sm text-stone-400 text-center py-16 font-medium">لا توجد بيانات مبيعات للتصنيفات حالياً</div>
            )}
          </div>
        </div>

        {/* أعلى المنتجات مبيعاً */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200/80 shadow-xs">
          <h3 className="font-black text-stone-900 text-base mb-6 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            <span>أعلى المنتجات مبيعاً</span>
          </h3>
          {topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50/80 text-stone-400 text-xs border-b border-stone-100">
                  <tr>
                    <th className="px-5 py-4 text-right font-bold">#</th>
                    <th className="px-5 py-4 text-right font-bold">المنتج</th>
                    <th className="px-5 py-4 text-right font-bold">الكمية المباعة</th>
                    <th className="px-5 py-4 text-right font-bold">الإيرادات</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50 font-medium">
                  {topProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-stone-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 font-black text-xs border border-amber-500/20">
                            {i + 1}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-black text-stone-900">{p.name}</td>
                        <td className="px-5 py-4 text-stone-600 font-bold">{p.qty} وحدة</td>
                        <td className="px-5 py-4 font-black text-amber-600">{formatPrice(p.revenue)}</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
          ) : (
              <div className="text-sm text-stone-400 text-center py-16 font-medium">لا توجد منتجات مباعة حتى الآن</div>
          )}
        </div>

      </div>
  );
}