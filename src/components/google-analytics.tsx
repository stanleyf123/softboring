import Script from "next/script";

export const DEFAULT_GA_MEASUREMENT_ID = "G-MFQ9J6B9DH";

export function gaMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_MEASUREMENT_ID;
}

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
