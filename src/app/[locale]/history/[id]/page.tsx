import { HistoryDetail } from "@/components/history-detail";
import { assertLocale } from "@/lib/locale";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function HistoryDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(assertLocale(locale));

  return (
    <div className="pt-6">
      <HistoryDetail id={id} />
    </div>
  );
}
