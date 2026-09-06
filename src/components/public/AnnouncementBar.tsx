import { usePublicCompany } from '@/public';

export default function AnnouncementBar() {
  const { company, status } = usePublicCompany();
  const announcement = company?.announcement_text?.trim();

  if (status !== 'ready' || !company?.announcement_enabled || !announcement) return null;

  return (
    <div
      className="public-announcement-ticker overflow-hidden bg-[#9C7537] text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/70"
      role="status"
      aria-label="إعلان الشركة"
      tabIndex={0}
    >
      <p className="sr-only">{announcement}</p>
      <div className="public-announcement-track flex min-h-9 w-max items-center py-1.5" aria-hidden="true">
        {[0, 1].map((segment) => (
          <div key={segment} className="public-announcement-segment flex shrink-0 items-center justify-around">
            {[0, 1, 2].map((copy) => (
              <span key={copy} className="public-announcement-copy flex shrink-0 items-center gap-5 whitespace-nowrap px-8 text-xs font-extrabold leading-6 sm:px-12 sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F1D59E]" />
                {announcement}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
