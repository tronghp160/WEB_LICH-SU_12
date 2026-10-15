import type { Metadata } from "next";
import Link from "next/link";
import { BankItemTable } from "@/components/admin/exam-bank/BankItemTable";
import { Notice } from "@/components/admin/Notice";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireRole } from "@/lib/auth";
import { EXAM_ITEM_KINDS, EXAM_ITEM_LEVELS, examBankPaths, examItemKindLabels, examItemLevelLabels } from "@/lib/exams/items";
import { BANK_PAGE_SIZE, countItemsByStatus, listExamItems } from "@/lib/queries/exam-bank";
import { getItemStats } from "@/lib/queries/exam-quality";
import { sgkLessons } from "@/lib/sgk/curriculum";
import { normalizeQuery } from "@/lib/utils/search";
import { workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

export const metadata: Metadata = { title: "Ngân hàng câu hỏi" };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
const pick = <T extends string>(options: readonly T[], value: string | undefined): T | null => options.find((option) => option === value) ?? null;
const STATUSES = Object.keys(workflowStatusLabels) as WorkflowStatus[];
const lessonNumbers = Object.fromEntries(sgkLessons.map((lesson) => [lesson.slug, lesson.number]));

export default async function ExamBankPage({ searchParams }: PageProps<"/quan-tri/ngan-hang-cau-hoi">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const query = await searchParams;
  const filters = {
    kind: pick(EXAM_ITEM_KINDS, first(query.dang)),
    lesson: sgkLessons.some((lesson) => lesson.slug === first(query.bai)) ? first(query.bai)! : null,
    grade: first(query.lop) === "11" ? (11 as const) : first(query.lop) === "12" ? (12 as const) : null,
    level: pick(EXAM_ITEM_LEVELS, first(query.muc)),
    status: pick(STATUSES, first(query["trang-thai"])),
    passage: first(query["tu-lieu"]) === "co" ? true : first(query["tu-lieu"]) === "khong" ? false : null,
    query: normalizeQuery(first(query.q)),
    page: Math.max(1, Number(first(query.trang)) || 1),
  };
  const [{ items, total }, counts] = await Promise.all([listExamItems(filters), countItemsByStatus()]);
  const stats = Object.fromEntries(await getItemStats(items.map((item) => item.id)));
  const filtered = Object.entries(filters).some(([key, value]) => key !== "page" && value !== null && value !== "");
  const pages = Math.max(1, Math.ceil(total / BANK_PAGE_SIZE));
  const canEdit = staff.role === "editor" || staff.role === "system_admin";
  const canReview = staff.role === "reviewer" || staff.role === "system_admin";
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (typeof value === "string" && key !== "trang") params.set(key, value);
    if (page > 1) params.set("trang", String(page));
    const search = params.toString();
    return search ? `${examBankPaths.list}?${search}` : examBankPaths.list;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Ngân hàng câu hỏi</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Câu trắc nghiệm và câu Đúng/Sai dùng để ghép đề luyện thi. Biên tập viên soạn và gửi duyệt; kiểm duyệt viên công bố. Đề chỉ dùng câu đã công
            bố (câu chờ duyệt được công bố cùng đề).
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {STATUSES.map((status) => `${workflowStatusLabels[status]}: ${counts[status]}`).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit &&
            EXAM_ITEM_KINDS.map((kind) => (
              <LinkButton key={kind} href={examBankPaths.create(kind)} size="sm">
                Câu {examItemKindLabels[kind]} mới
              </LinkButton>
            ))}
          <LinkButton href={examBankPaths.passages} size="sm" variant="secondary">
            Tư liệu
          </LinkButton>
          {canEdit && (
            <LinkButton href={examBankPaths.import} size="sm" variant="secondary">
              Nhập từ JSON
            </LinkButton>
          )}
        </div>
      </div>

      <Notice code={first(query["thong-bao"])} />

      <form method="get" role="search" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[2fr_repeat(6,minmax(0,1fr))] lg:items-end">
        <div className="flex flex-col gap-1.5 sm:col-span-3 lg:col-span-1">
          <label htmlFor="loc-q" className="text-sm font-medium text-foreground">Tìm trong câu hỏi / lựa chọn</label>
          <Input id="loc-q" name="q" defaultValue={filters.query} placeholder="Gõ có dấu hoặc không dấu" maxLength={100} />
        </div>
        <FilterSelect id="loc-dang" name="dang" label="Dạng" value={filters.kind} options={EXAM_ITEM_KINDS.map((kind) => [kind, examItemKindLabels[kind]])} />
        <FilterSelect id="loc-bai" name="bai" label="Bài" value={filters.lesson} options={sgkLessons.map((lesson) => [lesson.slug, `Bài ${lesson.number}`])} />
        <FilterSelect id="loc-lop" name="lop" label="Lớp" value={filters.grade ? String(filters.grade) : null} options={[["12", "Lớp 12"], ["11", "Lớp 11"]]} />
        <FilterSelect id="loc-muc" name="muc" label="Mức độ" value={filters.level} options={EXAM_ITEM_LEVELS.map((level) => [level, examItemLevelLabels[level]])} />
        <FilterSelect id="loc-tu-lieu" name="tu-lieu" label="Tư liệu" value={filters.passage === null ? null : filters.passage ? "co" : "khong"} options={[["co", "Có tư liệu"], ["khong", "Không có"]]} />
        <FilterSelect id="loc-trang-thai" name="trang-thai" label="Trạng thái" value={filters.status} options={STATUSES.map((status) => [status, workflowStatusLabels[status]])} />
        <div className="flex items-center gap-3 sm:col-span-3 lg:col-span-7">
          <Button type="submit" variant="secondary">Lọc</Button>
          {filtered && (
            <Link href={examBankPaths.list} className="text-sm font-medium text-accent hover:underline">
              Xóa lọc
            </Link>
          )}
          <span className="text-sm text-muted-foreground">{total} câu</span>
        </div>
      </form>

      <BankItemTable
        items={items}
        lessonNumbers={lessonNumbers}
        canSubmit={canEdit}
        canPublish={canReview}
        stats={stats}
        empty={
          <EmptyState
            title={filtered ? "Không có câu nào khớp bộ lọc" : "Ngân hàng chưa có câu nào"}
            description={filtered ? "Thử bỏ bớt điều kiện lọc." : "Soạn câu mới hoặc nhập hàng loạt từ tệp JSON."}
          />
        }
      />

      {pages > 1 && (
        <nav aria-label="Phân trang" className="flex items-center gap-3 text-sm">
          {filters.page > 1 && <Link href={pageHref(filters.page - 1)} className="text-accent hover:underline">← Trang trước</Link>}
          <span className="text-muted-foreground">Trang {filters.page}/{pages}</span>
          {filters.page < pages && <Link href={pageHref(filters.page + 1)} className="text-accent hover:underline">Trang sau →</Link>}
        </nav>
      )}
    </div>
  );
}

function FilterSelect({ id, name, label, value, options }: { id: string; name: string; label: string; value: string | null; options: [string, string][] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <Select id={id} name={name} defaultValue={value ?? ""}>
        <option value="">Tất cả</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </Select>
    </div>
  );
}
