import type { Metadata } from "next";
import { BattleReenactment } from "@/components/battle/BattleReenactment";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { bachDang938 } from "@/lib/battles/bach-dang-938";

export const metadata: Metadata = {
  title: "Tái hiện trận Bạch Đằng năm 938",
  description: `${bachDang938.summary} Xem từng bước diễn biến trên bản đồ hoạt hình.`,
};

/** Tái hiện trận đánh trên bản đồ (kịch bản viết cứng trong lib/battles, không đọc database). */
export default function BachDang938Page() {
  const scenario = bachDang938;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tái hiện trận Bạch Đằng năm 938" }]} />

      <header className="mt-4 max-w-3xl">
        <h1 className="text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">{scenario.title}</h1>
        <p className="mt-3 text-lg font-medium text-gold-deep">{scenario.dateText}</p>
        <p className="mt-4 text-lg text-muted-foreground">{scenario.summary}</p>
      </header>

      <p className="mt-6 max-w-3xl rounded-card border border-border bg-muted p-4 text-sm text-foreground" role="note">
        <strong>Lưu ý: </strong>
        {scenario.disclaimer}
      </p>

      <section aria-labelledby="mo-phong" className="mt-8">
        <h2 id="mo-phong" className="mb-4 font-serif text-2xl font-bold text-foreground">
          Diễn biến trên bản đồ
        </h2>
        <BattleReenactment scenario={scenario} />
      </section>

      <section aria-labelledby="nguon" className="mt-12">
        <h2 id="nguon" className="mb-4 font-serif text-2xl font-bold text-foreground">
          Nguồn tham khảo
        </h2>
        <ul className="flex max-w-3xl list-disc flex-col gap-2 pl-5 text-foreground">
          {scenario.sources.map((source) => (
            <li key={source.title}>
              <span className="font-medium">{source.title}</span>
              {source.note && <span className="text-muted-foreground"> — {source.note}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
