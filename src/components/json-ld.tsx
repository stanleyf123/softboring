import { siteJsonLd } from "@/lib/seo";

export function SiteJsonLd() {
  const data = siteJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
