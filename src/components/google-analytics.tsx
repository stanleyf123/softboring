import Script from "next/script";
import { gaMeasurementId } from "@/lib/analytics-note";

export { DEFAULT_GA_MEASUREMENT_ID, gaMeasurementId } from "@/lib/analytics-note";

/**
 * gtag.js for public pages. Loaded after hydration so it does not block render.
 * Mounted from the locale layout, so `/admin` is not instrumented.
 */
export function GoogleAnalytics() {
  const measurementId = gaMeasurementId();

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(measurementId)});
`}
      </Script>
    </>
  );
}
