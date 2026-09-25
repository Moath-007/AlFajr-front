import { usePublicCompany } from '@/public/usePublicCompany';

const offerings = [
  {
    title: 'تشكيلة متنوعة',
    description: 'منتجات وتجهيزات متعددة تناسب احتياجات المساحات المختلفة.',
  },
  {
    title: 'خيارات متعددة',
    description: 'خيارات مختلفة من المقاسات والألوان حسب كل منتج.',
  },
  {
    title: 'اهتمام بالتفاصيل',
    description: 'عرض واضح للمنتجات ومواصفاتها لمساعدة العميل في الاختيار.',
  },
];

export default function AboutPage() {
  const { company } = usePublicCompany();
  const companyName = company?.company_name?.trim();

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-[#162E21] text-white">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full border-[64px] border-[#C2A66D]/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-sm font-extrabold text-[#E8DCC2]">تعرف علينا عن قرب</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">من نحن</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300 sm:text-lg">
            {companyName ? `${companyName} تقدم` : 'نقدم'} حلولًا متكاملة من منتجات وتجهيزات المنزل بتصاميم عصرية وخيارات متنوعة تلائم مختلف المساحات والاحتياجات.
          </p>
        </div>
      </section>

      <main>
        <section className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:px-8">
            <div>
              <p className="text-sm font-extrabold text-[#C2A66D]">عن الفجر</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[#162E21] sm:text-4xl">تعرف إلى شركة الفجر للصناعة والتجارة</h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-stone-600">
              <p>نقدم لكم تشكيلة متكاملة من منتجات وتجهيزات المنزل، تشمل المغاسل والأحواض، مرايا المغاسل والديكور، مغاسل البورسلان، مغاسل الخشب، أحواض المطابخ، المراحيض، السيلكون، الإنارة المنزلية والأثاث.</p>
              <p>نسعى لتوفير منتجات تجمع بين الجودة العالية، التصاميم العصرية والتنوع، لتلبية احتياجاتكم ومنح كل مساحة لمسة مميزة وأنيقة.</p>
              <p className="font-black text-[#162E21]">اكتشف مجموعتنا واختر ما يناسب منزلك.</p>
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200 bg-stone-50/80 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-extrabold text-[#C2A66D]">ما الذي نقدمه؟</p>
              <h2 className="mt-3 text-3xl font-black text-[#162E21] sm:text-4xl">تجربة اختيار واضحة وبسيطة</h2>
              <p className="mt-4 text-base leading-8 text-stone-600">نركز على تنظيم الخيارات وعرض التفاصيل التي يحتاجها العميل عند تصفح المنتجات.</p>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {offerings.map((offering) => (
                <article key={offering.title} className="group relative min-h-52 overflow-hidden rounded-2xl border border-[#162E21]/10 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C2A66D]/50 hover:shadow-xl hover:shadow-[#162E21]/5 sm:p-7">
                  <span className="absolute inset-x-0 top-0 h-1 origin-right scale-x-0 bg-[#C2A66D] transition-transform duration-300 group-hover:scale-x-100" />
                  <span className="block h-px w-12 bg-[#C2A66D]/60 transition-all duration-300 group-hover:w-20" />
                  <h3 className="mt-10 text-xl font-black text-[#162E21]">{offering.title}</h3>
                  <p className="mt-3 text-base leading-7 text-stone-600">{offering.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid overflow-hidden rounded-[2rem] bg-[#162E21] text-white lg:grid-cols-[0.8fr_1.2fr]">
              <div className="bg-[#C2A66D] p-8 text-[#162E21] sm:p-10"><p className="text-sm font-extrabold text-[#162E21]/70">طريقة عملنا</p><h2 className="mt-3 text-3xl font-black leading-tight">وضوح في العرض واهتمام بالاختيار</h2></div>
              <div className="p-8 sm:p-10"><p className="text-base leading-8 text-stone-300">نعرض المنتجات وبياناتها بصورة منظمة، مع إبراز المقاسات والألوان والأسعار المتاحة لكل منتج حيثما توفرت، لتكون رحلة التصفح أكثر سهولة.</p></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
