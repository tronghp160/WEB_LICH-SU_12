"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { reviewExamAction, submitExamAction } from "@/lib/actions/exams";
import { initialActionState } from "@/lib/actions/state";
import { reviewActionLabels, type ReviewAction } from "@/lib/admin/review";
import type { ExamReadiness } from "@/lib/exams/admin";
import type { WorkflowStatus } from "@/lib/utils/labels";

type Props = {
  slug: string;
  status: WorkflowStatus;
  reviewNote: string | null;
  readiness: ExamReadiness;
  canSubmit: boolean;
  reviewActions: ReviewAction[];
};

/** Trạng thái duyệt của đề + điều kiện gửi duyệt + nút gửi duyệt (biên tập viên) / duyệt (kiểm duyệt viên). */
export function ExamWorkflowPanel({ slug, status, reviewNote, readiness, canSubmit, reviewActions }: Props) {
  const [submitState, submitAction, submitting] = useActionState(submitExamAction, initialActionState);
  const [reviewState, reviewAction, reviewing] = useActionState(reviewExamAction, initialActionState);
  const ready = readiness.blockers.length === 0;

  return (
    <section aria-labelledby="quy-trinh" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="quy-trinh" className="font-serif text-xl font-semibold text-foreground">
          Kiểm duyệt
        </h2>
        <StatusBadge status={status} />
      </div>

      {status === "needs_revision" && reviewNote && (
        <p className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-foreground">
          <strong>Yêu cầu chỉnh sửa:</strong> {reviewNote}
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm" aria-label="Điều kiện của đề">
        {ready && (
          <li className="flex items-start gap-2 text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            Đề đủ điều kiện gửi duyệt và công bố.
          </li>
        )}
        {readiness.blockers.map((item) => (
          <li key={item} className="flex items-start gap-2 text-accent">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {item}
          </li>
        ))}
        {readiness.warnings.map((item) => (
          <li key={item} className="flex items-start gap-2 text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      {/* Thông báo đặt ngoài form: gửi duyệt / trả về xong thì trạng thái đổi và form tương ứng biến mất. */}
      <FormMessage state={submitState} />
      <FormMessage state={reviewState} />

      {canSubmit && (
        <form action={submitAction} className="flex flex-col gap-2">
          <input type="hidden" name="slug" value={slug} />
          <div>
            <Button type="submit" disabled={submitting || !ready}>
              {submitting ? "Đang gửi…" : "Gửi duyệt"}
            </Button>
          </div>
        </form>
      )}

      {reviewActions.length > 0 && (
        <form action={reviewAction} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          {reviewActions.includes("request_revision") && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ly-do" className="text-sm font-medium text-foreground">
                Lý do yêu cầu chỉnh sửa (bắt buộc khi trả về)
              </label>
              <Textarea id="ly-do" name="reason" rows={2} maxLength={2000} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {reviewActions.map((action) => (
              <Button
                key={action}
                type="submit"
                name="action"
                value={action}
                disabled={reviewing}
                variant={action === "publish" || action === "republish" ? "primary" : "secondary"}
              >
                {reviewActionLabels[action]}
              </Button>
            ))}
          </div>
        </form>
      )}
    </section>
  );
}
