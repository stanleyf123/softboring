import { assertLocale } from "@/lib/locale";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Unknown paths under a real locale use the cream not-found card, not the root page. */
export default async function UnknownLocalePage({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  notFound();
}
