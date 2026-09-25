import { useEffect } from "react";

const SITE_URL = "https://alfajr.com.ps";
const DEFAULT_IMAGE = `${SITE_URL}/assets/al-fajr-logo.webp`;
const SITE_NAME = "شركة الفجر للصناعة والتجارة";

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "product";
  structuredData?: Record<string, unknown>;
}

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function absoluteUrl(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return fallback;
  }
}

export default function Seo({
  title,
  description,
  path = "/",
  image,
  noIndex = false,
  type = "website",
  structuredData,
}: SeoProps) {
  useEffect(() => {
    const canonicalUrl = absoluteUrl(path, SITE_URL);
    const imageUrl = absoluteUrl(image, DEFAULT_IMAGE);

    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    document.getElementById("seo-structured-data")?.remove();
    if (structuredData && !noIndex) {
      const script = document.createElement("script");
      script.id = "seo-structured-data";
      script.type = "application/ld+json";
      script.text = JSON.stringify(structuredData).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    }
  }, [description, image, noIndex, path, structuredData, title, type]);

  return null;
}

export { DEFAULT_IMAGE, SITE_NAME, SITE_URL };
