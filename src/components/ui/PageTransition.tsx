import { useLayoutEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}

export function PageRouteFallback() {
  return (
    <div
      className="page-route-placeholder space-y-4"
      aria-label="جاري تحميل الصفحة"
      aria-live="polite"
    >
      <div className="h-8 w-48 rounded-lg bg-stone-200/80" />
      <div className="h-24 rounded-2xl bg-stone-200/60" />
      <div className="h-64 rounded-2xl bg-stone-200/50" />
    </div>
  );
}
