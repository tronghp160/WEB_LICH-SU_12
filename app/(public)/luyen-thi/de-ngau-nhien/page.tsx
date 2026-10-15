import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { Shuffle } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Callout } from "@/components/ui/Callout";
import { BLUEPRINTS, blueprintSize } from "@/lib/exams/blueprint";
import { loadGeneratorPool } from "@/lib/exams/attempts-server";
import { examPaths } from "@/lib/exams/exam";
import { canGenerate, type PoolItem } from "@/lib/exams/generate";

export const metadata: Metadata = {
  title: "Đề tự sinh theo ma trận — Luyện thi THPT",
  description: "Mỗi lần làm là một đề mới từ ngân hàng câu hỏi Lịch sử 12, rải đều các bài theo số tiết, ưu tiên câu chưa làm.",
};

async function loadPool(): Promise<PoolItem[] | null> {
  try {
    return await loadGeneratorPool();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

// Đề tự sinh (docs/ke-hoach-luyen-thi.md, mục 4.4 — GĐ5). Chỉ liệt kê ma trận mà ngân hàng đủ câu cho ≥ 3 đề không trùng
// (không hứa suông); ngân hàng thay đổi theo ngày nên trang dựng theo từng yêu cầu.
export default async function GeneratedHubPage() {
  await connection();
  const pool = await loadPool();
  const ready = pool ? BLUEPRINTS.filter((blueprint) => canGenerate(pool, blueprint)) : [];
  const general = ready.filter((blueprint) => !blueprint.lessons);
  const topics = ready.filter((blueprint) => blueprint.lessons);

  const card = (blueprint: (typeof BLUEPRINTS)[number]) => (
    <li key={blueprint.id}>
      <Link href={examPaths.generated(blueprint.id)} className="flex h-full flex-col gap-1 rounded-card border border-border bg-surface p-4 hover:border-accent" data-testid={`blueprint-${blueprint.id}`}>
        <span className="font-serif text-lg font-semibold text-foreground">{blueprint.label}</span>
        <span className="text-sm text-muted-foreground">{blueprint.description}</span>
        <span className="text-xs text-muted-foreground">
          {blueprintSize(blueprint)} câu · {blueprint.durationMin} phút
        </span>
      </Link>
    </li>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Đề tự sinh" }]} />
      <header className="mb-6 mt-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">Gói luyện thi</p>
        <h1 className="mt-1 flex items-center gap-2 font-serif text-3xl font-bold text-foreground">
          <Shuffle className="h-7 w-7 text-gold-deep" aria-hidden="true" />
          Đề tự sinh theo ma trận
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mỗi lần bắt đầu, web chọn câu mới từ ngân hàng: rải các bài theo số tiết trong SGK, cân đối mức độ, đáp án đúng chia đều
          A/B/C/D, ưu tiên câu em chưa làm trong 14 ngày. Chấm điểm và phân tích như đề thường.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground" data-testid="blueprint-disclaimer">
          Ma trận do web tự đặt để luyện tập, <strong>không phải ma trận chính thức của Bộ GD&amp;ĐT</strong>.
        </p>
      </header>

      {pool === null ? (
        <Callout variant="warning" title="Chưa tải được ngân hàng câu hỏi">
          Em tải lại trang sau ít phút nhé.
        </Callout>
      ) : ready.length === 0 ? (
        <Callout variant="info" title="Ngân hàng câu hỏi đang được bổ sung">
          Đề tự sinh sẽ mở khi ngân hàng đủ câu cho ít nhất 3 đề không trùng nhau. Trong lúc chờ, em làm{" "}
          <Link href={examPaths.hub} className="text-accent underline">
            các đề có sẵn
          </Link>{" "}
          hoặc{" "}
          <Link href={examPaths.practice} className="text-accent underline">
            luyện tập theo bài
          </Link>
          .
        </Callout>
      ) : (
        <div className="flex flex-col gap-8">
          {general.length > 0 && (
            <section aria-labelledby="de-tong-hop" className="flex flex-col gap-3">
              <h2 id="de-tong-hop" className="font-serif text-2xl font-semibold text-foreground">
                Đề tổng hợp
              </h2>
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">{general.map(card)}</ul>
            </section>
          )}
          {topics.length > 0 && (
            <section aria-labelledby="de-chu-de" className="flex flex-col gap-3">
              <h2 id="de-chu-de" className="font-serif text-2xl font-semibold text-foreground">
                Theo chủ đề
              </h2>
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">{topics.map(card)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
