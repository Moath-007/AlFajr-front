import { Link } from 'react-router-dom';

const reports = [
  { path: 'sales', title: 'تقرير المبيعات', description: 'نشاط المبيعات والمردودات من القيود المالية.' },
  { path: 'collections', title: 'تقرير التحصيلات', description: 'سندات القبض وعكوسها وتسويات الشيكات.' },
  { path: 'account-balances', title: 'تقرير أرصدة الحسابات', description: 'الأرصدة الحالية لحسابات الحسابات.' },
  { path: 'returns', title: 'تقرير المردودات', description: 'نشاط المردودات وعكوسها.' },
  { path: 'inventory', title: 'تقرير المخزون', description: 'الأرصدة الحالية وحركات المخزون.' },
  { path: 'checks', title: 'تقرير الشيكات', description: 'مواقع الشيكات الحالية وسجل حركاتها.' },
  { path: 'products', title: 'تقرير المنتجات', description: 'نشاط بنود المبيعات والمردودات في المستندات الحالية.' },
  { path: 'representatives', title: 'تقرير المناديب', description: 'أداء مستندات طلبات الجملة الحالية.' },
  { path: 'write-offs', title: 'تقرير المسامحات', description: 'قيود المسامحات وعكوسها بتاريخ النشاط.' },
];

export default function AdminReportsPage() {
  return <main className="mx-auto max-w-[1350px] space-y-6 pb-10" dir="rtl">
    <header className="border-b pb-5"><h1 className="text-3xl font-black text-brand">التقارير</h1>
      <p className="mt-2 text-sm text-stone-600">اختر التقرير المناسب؛ لكل تقرير صفحته وفلاتره ومعنى أرقامه.</p></header>
    <nav aria-label="التقارير" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {reports.map((report) => <Link key={report.path} to={`/owner/reports/${report.path}`}
        className="rounded-2xl border bg-white p-5 transition hover:border-gold-dark hover:shadow-sm">
        <h2 className="text-lg font-black text-brand">{report.title} ←</h2>
        <p className="mt-2 text-sm text-stone-600">{report.description}</p>
      </Link>)}
    </nav>
  </main>;
}
