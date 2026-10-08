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
      <section className="relative overflow-hidden bg-[#0B1720] text-white">
        <img src="/assets/al-fajr-store-hero.webp" alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[45%_center] sm:object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(270deg,rgba(8,17,25,0.96)_0%,rgba(8,17,25,0.90)_32%,rgba(8,17,25,0.55)_55%,rgba(8,17,25,0.08)_100%)] sm:bg-[linear-gradient(270deg,rgba(8,17,25,0.96)_0%,rgba(8,17,25,0.90)_24%,rgba(8,17,25,0.65)_40%,rgba(8,17,25,0.12)_62%,transparent_100%)]" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-[300px] max-w-7xl items-center px-6 py-12 sm:min-h-[340px] sm:px-8 lg:min-h-[400px] lg:px-8 lg:py-16">
          <div className="w-full max-w-[22rem] text-right">
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">من نحن</h1>
            <p className="mt-5 text-base font-normal leading-8 text-[#F1F3F5] sm:text-lg sm:leading-9">{companyName ? `${companyName} تقدم` : 'نقدم'} حلولًا متكاملة للمنزل، بتصاميم عصرية وخيارات تناسب احتياجاتك.</p>
          </div>
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
