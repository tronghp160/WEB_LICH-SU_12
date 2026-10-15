import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { ExamRoom } from "@/components/exams/runner/ExamRoom";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Callout } from "@/components/ui/Callout";
import { getBlueprint } from "@/lib/exams/blueprint";
import { loadGeneratorPool } from "@/lib/exams/attempts-server";
import { examPaths } from "@/lib/exams/exam";
import { canGenerate } from "@/lib/exams/generate";

export async function generateMetadata({ params }: PageProps<"/luyen-thi/de-ngau-nhien/[maTran]">): Promise<Metadata> {
  const blueprint = getBlueprint((await params).maTran);
  return blueprint ? { title: `${blueprint.label} — Đề tự sinh — Luyện thi THPT`, description: blueprint.description, robots: { index: false, follow: true } } : {};
}

async function poolReady(blueprint: NonNullable<ReturnType<typeof getBlueprint>>): Promise<boolean | null> {
  try {
    const pool = await loadGeneratorPool();
    // Trang làm đề chỉ cần đủ câu cho MỘT đề (trang danh sách mới đòi 3 đề không trùng).
    return pool ? canGenerate(pool, blueprint, 1) : null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

// Làm một đề tự sinh (GĐ5): ExamRoom với nguồn là ma trận — bắt đầu thì server sinh đề mới (POST /api/luyen-thi/de-ngau-nhien).
export default async function GeneratedExamPage({ params }: PageProps<"/luyen-thi/de-ngau-nhien/[maTran]">) {
  const blueprint = getBlueprint((await params).maTran);
  if (!blueprint) notFound();
  // Ngân hàng đổi theo ngày: dựng theo từng yêu cầu, không lưu trang tĩnh.
  await connection();
  const ready = await poolReady(blueprint);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Luyện thi THPT", href: examPaths.hub },
          { label: "Đề tự sinh", href: examPaths.generatedHub },
          { label: blueprint.label },
        ]}
      />
      <header className="mb-6 mt-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">Đề tự sinh · Gói luyện thi</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-foreground">{blueprint.label}</h1>
        <p className="mt-2 text-muted-foreground">{blueprint.description}</p>
      </header>
      {ready ? (
        <ExamRoom slug={blueprint.id} blueprint={blueprint.id} title={`Đề tự sinh — ${blueprint.label}`} durationMin={blueprint.durationMin} free={false} format={blueprint.id === "thpt_2025" ? "thpt_2025" : "chuyen_de"} />
      ) : (
        <Callout variant={ready === null ? "warning" : "info"} title={ready === null ? "Chưa tải được ngân hàng câu hỏi" : "Ngân hàng chưa đủ câu cho dạng đề này"}>
          {ready === null ? "Em tải lại trang sau ít phút nhé. " : "Em chọn dạng đề khác hoặc quay lại sau nhé. "}
          <Link href={examPaths.generatedHub} className="text-accent underline">
            Các dạng đề tự sinh
          </Link>
        </Callout>
      )}
    </div>
  );
}
