import { EnvelopeDoodle, HeroDoodle, TeacupDoodle } from "@/components/soft-doodles";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

export type ThanksStep = {
  href: "/review" | "/wall" | "/account" | "/register";
  title: string;
  body: string;
  cta: string;
};

export function ThanksView({
  kicker,
  title,
  body,
  note,
  steps,
  nextHeading,
  doodle = "tea",
  extra,
}: {
  kicker: string;
  title: string;
  body: string;
  note?: string | null;
  steps: ThanksStep[];
  nextHeading: string;
  doodle?: "tea" | "envelope" | "hero";
  extra?: ReactNode;
}) {
  return (
    <div className="pt-2">
      <section
        className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between lg:gap-16"
        aria-labelledby="thanks-title"
      >
        <div className="max-w-lg lg:max-w-xl">
          <p className="font-display italic text-accent">{kicker}</p>
          <h1
            id="thanks-title"
            className="mt-5 font-display text-4xl leading-tight tracking-tight md:text-5xl"
          >
            {title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{body}</p>
          {note ? (
            <p
              className="mt-5 rounded-[1.5rem] bg-mint/80 px-5 py-4 text-sm leading-relaxed"
              role="status"
            >
              {note}
            </p>
          ) : null}
        </div>
        <div className="mx-auto w-full max-w-[14rem] shrink-0 sm:mx-0 sm:max-w-[12rem] md:max-w-[16rem]">
          {doodle === "hero" ? (
            <HeroDoodle />
          ) : doodle === "envelope" ? (
            <EnvelopeDoodle />
          ) : (
            <TeacupDoodle />
          )}
        </div>
      </section>

      {steps.length > 0 ? (
        <section className="mt-14" aria-labelledby="thanks-next">
          <h2 id="thanks-next" className="sr-only">
            {nextHeading}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3 lg:gap-6">
            {steps.map((step) => (
              <li
                key={step.href + step.cta}
                className="flex flex-col rounded-[1.75rem] bg-paper px-5 py-6 shadow-card"
              >
                <h3 className="font-display text-xl tracking-tight">{step.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{step.body}</p>
                <Link
                  href={step.href}
                  className="mt-6 inline-flex min-h-11 w-fit items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
                >
                  {step.cta}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {extra}
    </div>
  );
}
