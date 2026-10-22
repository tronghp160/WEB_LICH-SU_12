import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { ExamItemForm } from "@/components/admin/exam-bank/ExamItemForm";
import { ItemQualityPanel } from "@/components/admin/exam-bank/ItemQualityPanel";
import { WorkflowPanel } from "@/components/admin/exams/WorkflowPanel";
import { Notice } from "@/components/admin/Notice";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderActionButton } from "@/components/admin/payments/OrderActionButton";
import { ExamItemPreview } from "@/components/exams/ExamItemPreview";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { deleteBankAction, reviewBankAction, submitBankAction } from "@/lib/actions/exam-bank";
import { canEditContent } from "@/lib/admin/content-kinds";
import { availableReviewActions } from "@/lib/admin/review";
import { requireRole } from "@/lib/auth";
import { canSubmitExam, examAdminPaths } from "@/lib/exams/admin";
import { examBankPaths, examItemKindLabels, explainHints, findNearDuplicates, itemWarnings } from "@/lib/exams/items";
import { isUuid } from "@/lib/queries/admin-content";
import { getExamItem, getItemFormOptions, getStemsNear } from "@/lib/queries/exam-bank";
import { getItemStats, lastRegrade, listItemReports } from "@/lib/queries/exam-quality";

export const metadata: Metadata = { title: "Câu hỏi" };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function ExamItemPage({ params, searchParams }: PageProps<"/quan-tri/ngan-hang-cau-hoi/[id]">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [item, options] = await Promise.all([getExamItem(id), getItemFormOptions()]);
  if (!item) notFound();
  const query = await searchParams;
  const editable = canEditContent(staff.role, item.workflow_status);
  const nearby = findNearDuplicates(item.stem, await getStemsNear(item), item.id);
  const warnings = [...itemWarnings(item), ...explainHints(item)];
  const [stats, reports, regrade] = await Promise.all([getItemStats([item.id]), listItemReports(item.id), staff.role === "system_admin" ? lastRegrade(item.id) : null]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb items={[{ label: "Ngân hàng câu hỏi", href: examBankPaths.list }, { label: `Câu ${examItemKindLabels[item.kind]}` }]} />
        <h1 className="mt-3 font-serif text-2xl font-bold text-foreground">Câu {examItemKindLabels[item.kind]}</h1>
        {!editable && (
          <p className="mt-1 text-sm text-muted-foreground">
            {staff.role === "reviewer" ? "Kiểm duyệt viên chỉ đổi trạng thái câu, không sửa nội dung." : "Câu đang chờ duyệt hoặc đã công bố nên chỉ xem được."}
          </p>
        )}
      </div>

      <Notice code={first(query["thong-bao"])} />

      <WorkflowPanel
        fields={{ kind: "cau", id: item.id }}
        status={item.workflow_status}
        reviewNote={item.review_note}
        readiness={{
          blockers: [],
          warnings: [
            ...warnings,
            ...(item.passage && item.passage.workflow_status !== "published" ? ["Đoạn tư liệu chưa công bố — được gửi duyệt / công bố cùng câu."] : []),
          ],
        }}
        canSubmit={canSubmitExam(staff.role, item.workflow_status)}
        reviewActions={availableReviewActions(staff.role, item.workflow_status)}
        submitAction={submitBankAction}
        reviewAction={reviewBankAction}
      />

      {nearby.length > 0 && (
        <section aria-labelledby="gan-trung" className="rounded-card border border-orange-500/40 bg-orange-500/10 p-4 text-sm">
          <h2 id="gan-trung" className="mb-2 flex items-center gap-2 font-semibold text-foreground">
            <Info className="h-4 w-4" aria-hidden="true" />
            Câu gần giống trong ngân hàng
          </h2>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
            {nearby.map((other) => (
              <li key={other.id}>
                <Link href={examBankPaths.edit(other.id)} className="text-accent hover:underline">
                  {other.stem.length > 140 ? `${other.stem.slice(0, 140)}…` : other.stem}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="xem-truoc" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
        <h2 id="xem-truoc" className="font-serif text-xl font-semibold text-foreground">
          Xem trước (như học sinh thấy, kèm đáp án)
        </h2>
        <ExamItemPreview
          kind={item.kind}
          stem={item.stem}
          passage={item.passage}
          choices={item.choices}
          correctIndex={item.correct_index}
          statements={item.statements}
          choiceNotes={item.choice_notes}
          explanation={item.explanation}
          remember={item.remember}
          lessonSlug={item.lesson_slug}
          sectionId={item.section_id}
          showAnswers
        />
        {item.kind === "mcq" && <p className="text-xs text-muted-foreground">Trong đề, thứ tự lựa chọn có thể được xoay để rải đều đáp án.</p>}
      </section>

      <section aria-labelledby="noi-dung" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <h2 id="noi-dung" className="font-serif text-xl font-semibold text-foreground">
          Nội dung
        </h2>
        <ExamItemForm
          kind={item.kind}
          initial={{ ...item, passage_id: item.passage?.id ?? null }}
          readOnly={!editable}
          events={options.events}
          passages={options.passages}
        />
      </section>

      <ItemQualityPanel
        itemId={item.id}
        kind={item.kind}
        correctIndex={item.correct_index}
        stats={stats.get(item.id)}
        reports={reports}
        lastRegrade={regrade}
        canHandle={staff.role === "reviewer" || staff.role === "system_admin"}
        canRegrade={staff.role === "system_admin" && (item.workflow_status === "published" || item.workflow_status === "hidden")}
      />

      <section aria-labelledby="trong-de" className="flex flex-col gap-2 rounded-card border border-border p-5">
        <h2 id="trong-de" className="font-serif text-lg font-semibold text-foreground">
          Đề đang dùng câu này ({item.sets.length})
        </h2>
        {item.sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa nằm trong đề nào.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {item.sets.map((set) => (
              <li key={set.slug} className="flex items-center gap-2">
                <Link href={examAdminPaths.edit(set.slug)} className="text-accent hover:underline">
                  {set.title}
                </Link>
                <StatusBadge status={set.workflow_status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {editable && (item.workflow_status === "draft" || item.workflow_status === "needs_revision") && (
        <section aria-labelledby="xoa-cau" className="flex flex-col gap-2 rounded-card border border-border p-5">
          <h2 id="xoa-cau" className="font-serif text-lg font-semibold text-foreground">
            Xóa câu
          </h2>
          <p className="text-sm text-muted-foreground">Chỉ xóa được câu chưa nằm trong đề nào. Câu đã công bố thì không xóa, chỉ ẩn.</p>
          <OrderActionButton action={deleteBankAction} label="Xóa câu nháp" confirm="Xóa vĩnh viễn câu hỏi này?" fields={{ kind: "cau", id: item.id }} danger />
        </section>
      )}
    </div>
  );
}
