import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/admin/Notice";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { requireRole } from "@/lib/auth";
import { examBankPaths } from "@/lib/exams/items";
import { listPassages } from "@/lib/queries/exam-bank";
import { sgkLessons } from "@/lib/sgk/curriculum";
import { normalizeQuery } from "@/lib/utils/search";

export const metadata: Metadata = { title: "Tư liệu câu hỏi" };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
const lessonNumber = new Map(sgkLessons.map((lesson) => [lesson.slug, lesson.number]));

export default async function PassagesPage({ searchParams }: PageProps<"/quan-tri/ngan-hang-cau-hoi/tu-lieu">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const query = await searchParams;
  const keyword = normalizeQuery(first(query.q));
  const passages = await listPassages({ query: keyword });
  const canEdit = staff.role === "editor" || staff.role === "system_admin";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb items={[{ label: "Ngân hàng câu hỏi", href: examBankPaths.list }, { label: "Tư liệu" }]} />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Tư liệu</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">Đoạn trích văn kiện, tài liệu dùng chung cho nhiều câu hỏi. Mỗi đoạn phải ghi nguồn đầy đủ.</p>
          </div>
          {canEdit && <LinkButton href={`${examBankPaths.passages}/moi`}>Tư liệu mới</LinkButton>}
        </div>
      </div>

      <Notice code={first(query["thong-bao"])} />

      <form method="get" role="search" className="flex max-w-xl items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="loc-tu-lieu" className="text-sm font-medium text-foreground">Tìm theo tên</label>
          <Input id="loc-tu-lieu" name="q" defaultValue={keyword} maxLength={100} />
        </div>
        <Button type="submit" variant="secondary">Tìm</Button>
      </form>

      {passages.length === 0 ? (
        <EmptyState title={keyword ? "Không có tư liệu khớp" : "Chưa có tư liệu nào"} description="Tư liệu tạo ở đây hoặc nhập kèm câu hỏi từ tệp JSON." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {passages.map((passage) => (
            <li key={passage.id}>
              <Link href={examBankPaths.passage(passage.id)} className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 hover:border-accent sm:flex-row sm:items-center sm:gap-4">
                <span className="flex-1 font-medium text-foreground">{passage.title}</span>
                <span className="text-sm text-muted-foreground">
                  {passage.lessonSlug && lessonNumber.has(passage.lessonSlug) ? `Bài ${lessonNumber.get(passage.lessonSlug)} · ` : ""}
                  {passage.itemCount} câu dùng
                </span>
                <StatusBadge status={passage.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
