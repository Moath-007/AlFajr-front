import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
const sections=[
 {title:'الزبائن والموردون',reports:[
 {path:'customers',title:'تقرير الزبائن',description:'أرصدة الزبائن، المستحق لنا وعلينا، والشيكات المرتبطة.'},
 {path:'suppliers',title:'تقرير الموردين',description:'أرصدة الموردين، المستحق لنا وعلينا، والشيكات المرتبطة.'}]},
 {title:'البيع والشراء',reports:[
 {path:'sales',title:'تقرير المبيعات',description:'إجمالي البيع، مردود المبيعات، وصافي المبيعات خلال الفترة.'},
 {path:'purchases',title:'تقرير المشتريات',description:'شراء البضاعة وتصحيحاته وإلغاؤه؛ الدفع في تقرير الصرف.'},
 {path:'returns',title:'تقرير المردودات',description:'تفاصيل مردود البيع والشراء وكمياته وأثر إلغائه.'}]},
 {title:'الأموال والشيكات',reports:[
 {path:'collections',title:'تقرير المقبوضات',description:'النقد والشيكات والحوالات المقبوضة، مع التصحيحات والإلغاءات.'},
 {path:'disbursements',title:'تقرير الصرف',description:'المبالغ المصروفة والشيكات الصادرة وتصحيحاتها وإلغاؤها.'},
 {path:'checks',title:'تقرير الشيكات',description:'الشيكات الحالية والاستحقاقات وسجل انتقالها والتراجع عنها.'}]},
 {title:'المخزون والأداء',reports:[
 {path:'inventory',title:'أرصدة وحركات المخزون',description:'الكميات الحالية وسجل دخول البضاعة وخروجها خلال الفترة.'},
 {path:'products',title:'أداء المنتجات',description:'كميات البيع والمردود وقيمة المبيعات حسب المنتج.'},
 {path:'representatives',title:'تقرير المناديب',description:'الفواتير حسب منشئها وحالتها وقيمة الفواتير المكتملة.'}]}
];
export default function AdminReportsPage(){
 return <main dir="rtl" className="mx-auto max-w-[1350px] space-y-7 pb-10"><header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">التقارير</h1><p className="mt-2 text-sm text-stone-500">اختر التقرير، وحدّد فلاتره لعرض التفاصيل والطباعة.</p></header>{sections.map(section=><section key={section.title} className="space-y-3"><h2 className="text-lg font-bold text-brand">{section.title}</h2><nav aria-label={section.title} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{section.reports.map(report=><Link key={report.path} to={'/owner/reports/'+report.path} className="group rounded-xl border bg-white p-4 transition hover:border-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-brand">{report.title}</h3><ArrowLeft size={17} className="shrink-0 text-stone-400 group-hover:text-brand" aria-hidden/></div><p className="mt-2 text-sm leading-6 text-stone-500">{report.description}</p></Link>)}</nav></section>)}</main>;
}
