import { Link } from 'react-router-dom';

const reports = [
  { path: 'sales', title: 'تقرير المبيعات', description: 'المبيعات والمردودات خلال الفترة، مع إجمالي البيع والمردودات والمبيعات بعد المردودات، وتفصيل حسب الحساب واليوم أو الأسبوع أو الشهر.' },
  { path: 'collections', title: 'تقرير المقبوضات', description: 'المبالغ المقبوضة نقدًا أو بشيك، مع الإلغاءات وإرجاع الشيكات. يعرض الحساب وطريقة القبض والعملة ومسجل السند.' },
  { path: 'account-balances', title: 'تقرير أرصدة الحسابات', description: 'من عليه مبلغ لنا ومن له مبلغ علينا الآن، مع رصيد كل حساب والشيكات التي ما زالت معلقة.' },
  { path: 'purchases', title: 'تقرير المشتريات', description: 'مشتريات البضاعة خلال الفترة، مع الإلغاءات والتعديلات وحساب كل عملية. دفع قيمتها يظهر في تقرير الصرف.' },
  { path: 'disbursements', title: 'تقرير الصرف', description: 'المبالغ المصروفة خلال الفترة، مع الإلغاءات والتعديلات. قيمة الشيك الصادر تُحسب عند إصداره مرة واحدة.' },
  { path: 'returns', title: 'تقرير المردودات', description: 'مردودات البيع والشراء خلال الفترة، مع الكميات والمبالغ والإلغاءات والحساب المرتبط.' },
  { path: 'inventory', title: 'تقرير المخزون', description: 'الكميات المتوفرة الآن حسب المنتج والمقاس واللون، وسجل دخول البضاعة وخروجها خلال الفترة.' },
  { path: 'checks', title: 'تقرير الشيكات', description: 'الشيكات الواردة والصادرة ومكانها الحالي وموعد استحقاقها، مع سجل انتقالها وإلغائها.' },
  { path: 'products', title: 'تقرير المنتجات', description: 'كمية البيع والمردود لكل منتج وقيمة المنتجات المباعة. يعتمد على حالة الفواتير الحالية.' },
  { path: 'representatives', title: 'تقرير المناديب', description: 'عدد الفواتير المكتملة والمعلقة والملغاة التي أنشأها كل مندوب، وقيمة فواتيره المكتملة.' },
];

export default function AdminReportsPage() {
  return <main className="mx-auto max-w-[1350px] space-y-6 pb-10" dir="rtl">
    <header className="border-b pb-5"><h1 className="text-3xl font-black text-brand">التقارير</h1>
      <p className="mt-2 text-sm text-stone-600">اختر ما تريد معرفته. داخل كل تقرير يمكنك تحديد الفلاتر وفتح التفاصيل وطباعة كل النتائج.</p></header>
    <nav aria-label="التقارير" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {reports.map((report) => <Link key={report.path} to={`/owner/reports/${report.path}`}
        className="rounded-2xl border bg-white p-5 transition hover:border-gold-dark hover:shadow-sm">
        <h2 className="text-lg font-black text-brand">{report.title} ←</h2>
        <p className="mt-2 text-sm text-stone-600">{report.description}</p>
      </Link>)}
    </nav>
  </main>;
}
