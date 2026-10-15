import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PassageForm } from "@/components/admin/exam-bank/PassageForm";
import { WorkflowPanel } from "@/components/admin/exams/WorkflowPanel";
import { Notice } from "@/components/admin/Notice";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderActionButton } from "@/components/admin/payments/OrderActionButton";
import { PassageBlock } from "@/components/exams/ExamItemPreview";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { deleteBankAction, reviewBankAction, submitBankAction } from "@/lib/actions/exam-bank";
import { canEditContent } from "@/lib/admin/content-kinds";
import { availableReviewActions } from "@/lib/admin/review";
import { requireRole } from "@/lib/auth";
import { canSubmitExam } from "@/lib/exams/admin";
import { examBankPaths, examItemKindLabels } from "@/lib/exams/items";
import { isUuid } from "@/lib/queries/admin-content";
import { getPassage } from "@/lib/queries/exam-bank";

export const metadata: Metadata = { title: "Tư liệu" };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function PassagePage({ params, searchParams }: PageProps<"/quan-tri/ngan-hang-cau-hoi/tu-lieu/[id]">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const passage = await getPassage(id);
  if (!passage) notFound();
  const query = await searchParams;
  const editable = canEditContent(staff.role, passage.workflow_status);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb items={[{ label: "Ngân hàng câu hỏi", href: examBankPaths.list }, { label: "Tư liệu", href: examBankPaths.passages }, { label: passage.title }]} />
        <h1 className="mt-3 font-serif text-2xl font-bold text-foreground">{passage.title}</h1>
      </div>

      <Notice code={first(query["thong-bao"])} />

      <WorkflowPanel
        fields={{ kind: "tu-lieu", id: passage.id }}
        status={passage.workflow_status}
        reviewNote={passage.review_note}
        canSubmit={canSubmitExam(staff.role, passage.workflow_status)}
        reviewActions={availableReviewActions(staff.role, passage.workflow_status)}
        submitAction={submitBankAction}
        reviewAction={reviewBankAction}
      />

      <section aria-labelledby="xem-truoc" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
        <h2 id="xem-truoc" className="font-serif text-xl font-semibold text-foreground">Xem trước</h2>
        <PassageBlock passage={passage} />
      </section>

      <section aria-labelledby="noi-dung" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <h2 id="noi-dung" className="font-serif text-xl font-semibold text-foreground">Nội dung</h2>
        <PassageForm initial={passage} readOnly={!editable} />
      </section>

      <section aria-labelledby="cau-dung" className="flex flex-col gap-2 rounded-card border border-border p-5">
        <h2 id="cau-dung" className="font-serif text-lg font-semibold text-foreground">Câu hỏi dùng tư liệu này ({passage.exam_items.length})</h2>
        {passage.exam_items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có câu nào. Khi soạn câu, chọn tư liệu này ở ô “Đoạn tư liệu”.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {passage.exam_items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <Link href={examBankPaths.edit(item.id)} className="text-accent hover:underline">
                  [{examItemKindLabels[item.kind]}] {item.stem.length > 120 ? `${item.stem.slice(0, 120)}…` : item.stem}
                </Link>
                <StatusBadge status={item.workflow_status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {editable && (passage.workflow_status === "draft" || passage.workflow_status === "needs_revision") && (
        <section aria-labelledby="xoa" className="flex flex-col gap-2 rounded-card border border-border p-5">
          <h2 id="xoa" className="font-serif text-lg font-semibold text-foreground">Xóa tư liệu</h2>
          <p className="text-sm text-muted-foreground">Chỉ xóa được tư liệu chưa có câu nào dùng.</p>
          <OrderActionButton action={deleteBankAction} label="Xóa tư liệu nháp" confirm="Xóa vĩnh viễn tư liệu này?" fields={{ kind: "tu-lieu", id: passage.id }} danger />
        </section>
      )}
    </div>
  );
}
