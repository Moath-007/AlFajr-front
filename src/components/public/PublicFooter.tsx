import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getPublicCompanyDetails, usePublicCompany } from "@/public";

interface PublicFooterProps {
  onNavigate: (page: string) => void;
}

export default function PublicFooter({ onNavigate }: PublicFooterProps) {
  const { company, status } = usePublicCompany();
  const { companyName, phones, email, location, workingHours } =
    getPublicCompanyDetails(company);
  const hasContactDetails = Boolean(
    phones.length || email || location || workingHours,
  );

  return (
    <footer className="mt-16 bg-[#162E21] text-stone-300">
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.1fr_0.8fr_1.3fr]">
          <div>
            <button
              onClick={() => onNavigate("home")}
              className="group flex items-center gap-3 text-right"
            >
              <span className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl bg-white transition-transform group-hover:-translate-y-0.5">
                <img
                  src="/assets/al-fajr-logo.png"
                  alt="شعار شركة الفجر"
                  className="h-full w-full object-cover object-[center_45%]"
                />
              </span>
              <span className="text-lg font-black text-white">
                {companyName || "شركة الفجر"}
              </span>
            </button>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-extrabold text-white">
              روابط سريعة
            </h2>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-1">
              {(
                [
                  ["home", "الرئيسية"],
                  ["products", "المنتجات"],
                  ["categories", "التصنيفات"],
                  ["about", "من نحن"],
                  ["contact", "اتصل بنا"],
                ] as const
              ).map(([page, label]) => (
                <li key={page}>
                  <button
                    onClick={() => onNavigate(page)}
                    className="transition hover:text-[#E8DCC2]"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-extrabold text-white">
              معلومات التواصل
            </h2>
            {status === "loading" && (
              <div
                className="space-y-3"
                aria-label="جاري تحميل معلومات التواصل"
              >
                <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-56 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
              </div>
            )}
            {status === "ready" && hasContactDetails && (
              <ul className="space-y-3 text-sm leading-6">
                {phones.map((phone) => (
                  <li key={phone} className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-[#E8DCC2]" />
                    <a
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      dir="ltr"
                      className="transition hover:text-white"
                    >
                      {phone}
                    </a>
                  </li>
                ))}
                {email && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-[#E8DCC2]" />
                    <a
                      href={`mailto:${email}`}
                      className="break-all transition hover:text-white"
                    >
                      {email}
                    </a>
                  </li>
                )}
                {location && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#E8DCC2]" />
                    <span>{location}</span>
                  </li>
                )}
                {workingHours && (
                  <li className="flex items-start gap-2.5">
                    <Clock className="mt-1 h-4 w-4 shrink-0 text-[#E8DCC2]" />
                    <span>{workingHours}</span>
                  </li>
                )}
              </ul>
            )}
            {status === "ready" && !hasContactDetails && (
              <p className="text-sm text-stone-400">
                لا تتوفر معلومات تواصل حاليًا.
              </p>
            )}
            {(status === "error" || status === "missing") && (
              <p className="text-sm text-stone-400">
                تعذر عرض معلومات التواصل حاليًا.
              </p>
            )}
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pb-5 pt-6 text-center text-xs text-stone-400 sm:pb-6">
          © {new Date().getFullYear()} {companyName || "شركة الفجر"}. جميع
          الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
