import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ExamQuestionManager } from "@/components/admin/exams/ExamQuestionManager";
import { ExamSetForm } from "@/components/admin/exams/ExamSetForm";
import { ExamWorkflowPanel } from "@/components/admin/exams/ExamWorkflowPanel";
import { OrderActionButton } from "@/components/admin/payments/OrderActionButton";
import { deleteExamSetAction } from "@/lib/actions/exams";
import { availableReviewActions } from "@/lib/admin/review";
import { requireRole } from "@/lib/auth";
import { canEditExam, canSubmitExam, examAdminPaths, examReadiness } from "@/lib/exams/admin";
import { examPaths } from "@/lib/exams/exam";
import { getExamSetForStaff } from "@/lib/queries/admin-exams";

export async function generateMetadata({ params }: PageProps<"/quan-tri/de-luyen-thi/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Soạn đề ${slug}` };
}

export default async function ExamSetEditPage({ params }: PageProps<"/quan-tri/de-luyen-thi/[slug]">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const { slug } = await params;
  const data = await getExamSetForStaff(slug);
  if (!data) notFound();
  const { set, questions, events } = data;
  const editable = canEditExam(staff.role, set.workflow_status);
  const readiness = examReadiness(set, questions);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href={examAdminPaths.list} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tất cả đề
        </Link>
        <h1 className="font-serif text-3xl font-bold text-foreground">{set.title}</h1>
        {set.workflow_status === "published" && (
          <Link href={examPaths.set(set.slug)} className="inline-flex items-center gap-1 text-sm text-accent hover:underline" target="_blank">
            Xem trang công khai
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
        {!editable && (
          <p className="text-sm text-muted-foreground">
            {staff.role === "reviewer"
              ? "Kiểm duyệt viên chỉ đổi trạng thái đề, không sửa nội dung."
              : "Đề đang chờ duyệt hoặc đã công bố nên chỉ xem được. Kiểm duyệt viên cần trả về chỉnh sửa trước."}
          </p>
        )}
      </div>

      <ExamWorkflowPanel
        slug={set.slug}
        status={set.workflow_status}
        reviewNote={set.review_note}
        readiness={readiness}
        canSubmit={canSubmitExam(staff.role, set.workflow_status)}
        reviewActions={availableReviewActions(staff.role, set.workflow_status)}
      />

      <section aria-labelledby="thong-tin-de" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <h2 id="thong-tin-de" className="font-serif text-xl font-semibold text-foreground">
          Thông tin đề
        </h2>
        <ExamSetForm
          set={{ slug: set.slug, title: set.title, description: set.description, duration_min: set.duration_min, sort_order: set.sort_order, free: set.product_id === null }}
          readOnly={!editable}
        />
      </section>

      <section aria-labelledby="cau-hoi" className="flex flex-col gap-4">
        <h2 id="cau-hoi" className="font-serif text-xl font-semibold text-foreground">
          Câu hỏi ({questions.length})
        </h2>
        <ExamQuestionManager slug={set.slug} questions={questions} events={events} readOnly={!editable} />
      </section>

      {editable && (set.workflow_status === "draft" || set.workflow_status === "needs_revision") && (
        <section aria-labelledby="xoa-de" className="flex flex-col gap-2 rounded-card border border-border p-5">
          <h2 id="xoa-de" className="font-serif text-lg font-semibold text-foreground">
            Xóa đề
          </h2>
          <p className="text-sm text-muted-foreground">Xóa vĩnh viễn đề nháp này cùng toàn bộ câu hỏi. Đề đã công bố thì không xóa, chỉ ẩn.</p>
          <OrderActionButton
            action={deleteExamSetAction}
            label="Xóa đề nháp"
            confirm={`Xóa vĩnh viễn "${set.title}" và ${questions.length} câu hỏi?`}
            fields={{ slug: set.slug }}
            danger
          />
        </section>
      )}
    </div>
  );
}
