import type { ReactNode } from "react";
import { EnvelopeDoodle, SoftMark, TeacupDoodle } from "./soft-doodles";

export function AuthPageShell({
  title,
  lead,
  doodle,
  children,
}: {
  title: string;
  lead: string;
  doodle: "login" | "register";
  children: ReactNode;
}) {
  return (
    <div className="relative pt-4">
      <p className="inline-flex items-center gap-2 rounded-full bg-peach/80 px-3 py-1 text-sm text-muted">
        <SoftMark className="h-6 w-6" />
        Soft Boring
      </p>
      <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight tracking-tight">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{lead}</p>
        </div>
        <div className="mx-auto w-full max-w-[10rem] shrink-0 sm:mx-0 sm:max-w-[9.5rem]">
          {doodle === "login" ? <TeacupDoodle /> : <EnvelopeDoodle />}
        </div>
      </div>
      <div className="relative mt-10 max-w-md">{children}</div>
    </div>
  );
}
