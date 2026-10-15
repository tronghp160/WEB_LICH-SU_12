import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ExamSetComposer } from "@/components/admin/exams/ExamSetComposer";
import { ExamSetForm } from "@/components/admin/exams/ExamSetForm";
import { WorkflowPanel } from "@/components/admin/exams/WorkflowPanel";
import { Notice } from "@/components/admin/Notice";
import { OrderActionButton } from "@/components/admin/payments/OrderActionButton";
import { deleteExamSetAction, reviewExamAction, submitExamAction } from "@/lib/actions/exams";
import { availableReviewActions } from "@/lib/admin/review";
import { requireRole } from "@/lib/auth";
import { canEditExam, canSubmitExam, examAdminPaths, examReadiness } from "@/lib/exams/admin";
import { examPaths } from "@/lib/exams/exam";
import { examFormatLabels, parseExamFormat } from "@/lib/exams/format";
import { EXAM_ITEM_KINDS, EXAM_ITEM_LEVELS } from "@/lib/exams/items";
import { getExamSetForStaff, searchBankForSet } from "@/lib/queries/admin-exams";
import { normalizeQuery } from "@/lib/utils/search";

export async function generateMetadata({ params }: PageProps<"/quan-tri/de-luyen-thi/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Soạn đề ${slug}` };
}

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
const pick = <T extends string>(options: readonly T[], value: string | undefined): T | null => options.find((option) => option === value) ?? null;

export default async function ExamSetEditPage({ params, searchParams }: PageProps<"/quan-tri/de-luyen-thi/[slug]">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const { slug } = await params;
  const query = await searchParams;
  const data = await getExamSetForStaff(slug);
  if (!data) notFound();
  const { set, items } = data;
  const format = parseExamFormat(set.format);
  const editable = canEditExam(staff.role, set.workflow_status);
  const readiness = examReadiness(
    { duration_min: set.duration_min, format },
    items.map((item) => ({
      kind: item.kind,
      section: item.section,
      correct_index: item.correctIndex,
      shift: item.shift,
      explanation: item.explanation,
      source_note: item.sourceNote,
      status: item.status,
      level: item.level,
      event_id: item.eventId,
      hasPassage: item.passage !== null,
    })),
  );
  const filters = {
    query: normalizeQuery(first(query.tim)),
    kind: pick(EXAM_ITEM_KINDS, first(query.dang)),
    lesson: first(query.bai) || null,
    level: pick(EXAM_ITEM_LEVELS, first(query.muc)),
  };
  const picker = editable ? { items: await searchBankForSet(set.id, filters), filters } : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href={examAdminPaths.list} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tất cả đề
        </Link>
        <h1 className="font-serif text-3xl font-bold text-foreground">{set.title}</h1>
        <p className="text-sm text-muted-foreground">{examFormatLabels[format]}</p>
        {set.workflow_status === "published" && (
          <Link href={examPaths.set(set.slug)} className="inline-flex items-center gap-1 text-sm text-accent hover:underline" target="_blank">
            Xem trang công khai
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
        {!editable && (
          <p className="text-sm text-muted-foreground">
            {staff.role === "reviewer"
              ? "Kiểm duyệt viên chỉ đổi trạng thái đề, không sửa nội dung. Công bố đề sẽ công bố luôn các câu đang chờ duyệt trong đề."
              : "Đề đang chờ duyệt hoặc đã công bố nên chỉ xem được. Kiểm duyệt viên cần trả về chỉnh sửa trước."}
          </p>
        )}
      </div>

      <Notice code={first(query["thong-bao"])} />

      <WorkflowPanel
        fields={{ slug: set.slug }}
        status={set.workflow_status}
        reviewNote={set.review_note}
        readiness={readiness}
        readyLabel="Đề đủ điều kiện gửi duyệt và công bố."
        canSubmit={canSubmitExam(staff.role, set.workflow_status)}
        reviewActions={availableReviewActions(staff.role, set.workflow_status)}
        submitAction={submitExamAction}
        reviewAction={reviewExamAction}
      />

      <section aria-labelledby="thong-tin-de" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <h2 id="thong-tin-de" className="font-serif text-xl font-semibold text-foreground">
          Thông tin đề
        </h2>
        <ExamSetForm
          set={{
            slug: set.slug,
            title: set.title,
            description: set.description,
            format: set.format,
            duration_min: set.duration_min,
            difficulty: set.difficulty,
            sort_order: set.sort_order,
            free: set.product_id === null,
          }}
          readOnly={!editable}
        />
      </section>

      <section aria-labelledby="cau-hoi" className="flex flex-col gap-4">
        <h2 id="cau-hoi" className="font-serif text-xl font-semibold text-foreground">
          Câu hỏi ({items.length})
        </h2>
        <ExamSetComposer slug={set.slug} format={format} items={items} editable={editable} picker={picker} />
      </section>

      {editable && (set.workflow_status === "draft" || set.workflow_status === "needs_revision") && (
        <section aria-labelledby="xoa-de" className="flex flex-col gap-2 rounded-card border border-border p-5">
          <h2 id="xoa-de" className="font-serif text-lg font-semibold text-foreground">
            Xóa đề
          </h2>
          <p className="text-sm text-muted-foreground">Xóa vĩnh viễn đề nháp này. Các câu chỉ bị gỡ khỏi đề, vẫn còn trong ngân hàng. Đề đã công bố thì không xóa, chỉ ẩn.</p>
          <OrderActionButton action={deleteExamSetAction} label="Xóa đề nháp" confirm={`Xóa vĩnh viễn "${set.title}"?`} fields={{ slug: set.slug }} danger />
        </section>
      )}
    </div>
  );
}
