import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, NotebookPen } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { loginPath } from "@/lib/auth/routes";
import { getNotebook, hasAccountPack } from "@/lib/exams/attempts-server";
import { examPaths } from "@/lib/exams/exam";
import { examItemKindLabels } from "@/lib/exams/items";
import { LEITNER_INTERVALS, describeDue, vietnamDay } from "@/lib/exams/leitner";
import { sgkLessons, sgkPaths } from "@/lib/sgk/curriculum";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

// Sổ câu sai (docs/ke-hoach-luyen-thi.md, mục 4.5 — GĐ4): câu làm sai trong lượt thi / luyện tập tự vào sổ, ôn theo hộp
// Leitner. Cần đăng nhập (sổ gắn với tài khoản); ôn đến hạn thuộc Gói luyện thi. Trang riêng tư, không lập chỉ mục.
export const metadata: Metadata = { title: "Sổ câu sai — Luyện thi THPT", robots: { index: false, follow: false } };

const lessonNumber = new Map(sgkLessons.map((lesson) => [lesson.slug, lesson.number]));
const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

function Header() {
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Sổ câu sai" }]} />
      <header className="mb-6 mt-4">
        <h1 className="flex items-center gap-2 font-serif text-3xl font-bold text-foreground">
          <NotebookPen className="h-7 w-7 text-gold-deep" aria-hidden="true" />
          Sổ câu sai
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Câu em làm sai khi thi hoặc luyện tập tự vào sổ. Ôn đúng thì câu được giãn lịch ôn ({LEITNER_INTERVALS.join(" → ")} ngày); đúng ở lần ôn cuối thì ra
          khỏi sổ. Ôn sai thì quay lại ôn từ ngày mai.
        </p>
      </header>
    </>
  );
}

export default async function NotebookPage({ searchParams }: PageProps<"/luyen-thi/so-cau-sai">) {
  const query = await searchParams;
  const { data: auth } = await (await createClient()).auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;

  if (!userId) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <Header />
        <Callout variant="info" title="Đăng nhập để lưu sổ câu sai">
          Sổ câu sai gắn với tài khoản để em ôn trên máy nào cũng được.{" "}
          <Link href={loginPath(examPaths.notebook)} className="text-accent underline">
            Đăng nhập
          </Link>{" "}
          (đã mua gói bằng mã? Sau khi đăng nhập, thêm mã vào tài khoản ở trang Tài khoản).
        </Callout>
      </div>
    );
  }

  const [notebook, pack] = await Promise.all([getNotebook(userId), hasAccountPack(userId)]);
  if (!notebook) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <Header />
        <Callout variant="warning" title="Chưa tải được sổ câu sai">
          Em tải lại trang sau ít phút nhé.
        </Callout>
      </div>
    );
  }

  const today = vietnamDay();
  const showAll = first(query.xem) === "tat-ca";
  const lesson = first(query.bai) ?? null;
  const rows = notebook.items
    .map((item) => ({ ...item, dueDay: vietnamDay(new Date(item.dueAt)) }))
    .filter((item) => showAll || item.dueDay <= today)
    .filter((item) => !lesson || item.lessonSlug === lesson);
  const lessonsInBook = [...new Set(notebook.items.map((item) => item.lessonSlug).filter((slug): slug is string => Boolean(slug)))];
  const tab = (active: boolean) =>
    cn(
      "inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium",
      active ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-muted",
    );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Header />
      <section aria-label="Ôn đến hạn" className="mb-6 flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-5">
        <p className="text-foreground" data-testid="notebook-summary">
          Sổ có <strong>{notebook.total}</strong> câu · <strong>{notebook.due}</strong> câu đến hạn ôn hôm nay.
        </p>
        {notebook.due > 0 && (
          <LinkButton href={examPaths.review} size="lg">
            Ôn ngay ({notebook.due} câu)
          </LinkButton>
        )}
        {!pack && (
          <p className="text-sm text-muted-foreground">
            Ôn câu đến hạn thuộc{" "}
            <Link href={examPaths.hub} className="text-accent underline">
              Gói luyện thi
            </Link>
            . Em vẫn xem được sổ và luyện miễn phí 10 câu / ngày ở{" "}
            <Link href={examPaths.practice} className="text-accent underline">
              Luyện tập theo bài
            </Link>
            .
          </p>
        )}
      </section>

      <nav aria-label="Xem sổ" className="mb-4 flex flex-wrap gap-2">
        <Link href={examPaths.notebook} className={tab(!showAll)} aria-current={!showAll ? "page" : undefined}>
          Đến hạn hôm nay ({notebook.due})
        </Link>
        <Link href={`${examPaths.notebook}?xem=tat-ca`} className={tab(showAll)} aria-current={showAll ? "page" : undefined}>
          Tất cả câu sai ({notebook.total})
        </Link>
      </nav>
      {showAll && lessonsInBook.length > 1 && (
        <nav aria-label="Lọc theo bài" className="mb-4 flex flex-wrap gap-3 text-sm">
          <Link href={`${examPaths.notebook}?xem=tat-ca`} className={cn("text-accent underline-offset-2 hover:underline", !lesson && "font-semibold")}>
            Mọi bài
          </Link>
          {lessonsInBook.map((slug) => (
            <Link key={slug} href={`${examPaths.notebook}?xem=tat-ca&bai=${slug}`} className={cn("text-accent underline-offset-2 hover:underline", lesson === slug && "font-semibold")}>
              Bài {lessonNumber.get(slug) ?? "?"}
            </Link>
          ))}
        </nav>
      )}

      {rows.length === 0 ? (
        <p className="text-muted-foreground">{showAll ? "Sổ chưa có câu nào. Làm đề hoặc luyện tập để bắt đầu." : "Hôm nay không có câu nào đến hạn ôn."}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="notebook-items">
          {rows.map((item) => (
            <li key={item.itemId} className="flex flex-col gap-1 rounded-card border border-border bg-surface p-3">
              <span className="text-foreground">{item.stem.length > 200 ? `${item.stem.slice(0, 200)}…` : item.stem}</span>
              <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{examItemKindLabels[item.kind]}</span>
                {item.lessonSlug && lessonNumber.has(item.lessonSlug) && (
                  <Link href={sgkPaths.lesson(item.lessonSlug)} className="inline-flex items-center gap-1 text-accent hover:underline">
                    <BookOpen className="h-3 w-3" aria-hidden="true" />
                    Bài {lessonNumber.get(item.lessonSlug)}
                  </Link>
                )}
                <span>Sai {item.wrongCount} lần</span>
                <span>Hộp {item.box}/5</span>
                <span className={item.dueDay <= today ? "font-medium text-accent" : undefined}>{describeDue(item.dueDay, today)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
