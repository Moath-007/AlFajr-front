import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import Seo, { DEFAULT_IMAGE, SITE_NAME, SITE_URL } from "./Seo";

const publicPages: Record<string, { title: string; description: string }> = {
  "/": {
    title: "شركة الفجر للصناعة والتجارة | الأدوات الصحية ومستلزمات الحمامات",
    description: "تصفح منتجات شركة الفجر للصناعة والتجارة من الأدوات الصحية ومستلزمات الحمامات والمرايا والمغاسل والخزائن والإكسسوارات.",
  },
  "/products": {
    title: "منتجات الأدوات الصحية ومستلزمات الحمامات | شركة الفجر",
    description: "اكتشف تشكيلة شركة الفجر من الأدوات الصحية ومستلزمات الحمامات والمرايا والمغاسل والخزائن والإكسسوارات.",
  },
  "/categories": {
    title: "تصنيفات المنتجات | شركة الفجر",
    description: "تصفح تصنيفات الأدوات الصحية ومستلزمات الحمامات المتوفرة لدى شركة الفجر للصناعة والتجارة.",
  },
  "/about": {
    title: "من نحن | شركة الفجر للصناعة والتجارة",
    description: "تعرف على شركة الفجر للصناعة والتجارة وخبرتها في توفير الأدوات الصحية ومستلزمات الحمامات.",
  },
  "/contact": {
    title: "اتصل بنا | شركة الفجر للصناعة والتجارة",
    description: "تواصل مع شركة الفجر للاستفسار عن الأدوات الصحية ومستلزمات الحمامات والمنتجات المتوفرة.",
  },
};

export default function RouteSeo() {
  const { pathname } = useLocation();
  const page = publicPages[pathname];
  const isProduct = /^\/products\/\d+$/.test(pathname);
  const noIndex = !page && !isProduct;

  const structuredData = useMemo(() => {
    if (pathname !== "/") return undefined;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
          logo: DEFAULT_IMAGE,
        },
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          name: SITE_NAME,
          url: SITE_URL,
          inLanguage: "ar",
          publisher: { "@id": `${SITE_URL}/#organization` },
        },
      ],
    };
  }, [pathname]);

  if (page) {
    return <Seo {...page} path={pathname} structuredData={structuredData} />;
  }

  if (isProduct) {
    return (
      <Seo
        title={`تفاصيل المنتج | ${SITE_NAME}`}
        description="تفاصيل المنتج والمقاسات والألوان المتوفرة لدى شركة الفجر للصناعة والتجارة."
        path={pathname}
      />
    );
  }

  return (
    <Seo
      title={`صفحة خاصة | ${SITE_NAME}`}
      description="صفحة خاصة ضمن موقع شركة الفجر للصناعة والتجارة."
      path={pathname}
      noIndex={noIndex}
    />
  );
}
