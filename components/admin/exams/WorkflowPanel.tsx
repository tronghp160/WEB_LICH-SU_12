"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { initialActionState, type ActionState } from "@/lib/actions/state";
import { reviewActionLabels, type ReviewAction } from "@/lib/admin/review";
import type { WorkflowStatus } from "@/lib/utils/labels";

type Action = (previous: ActionState, formData: FormData) => Promise<ActionState>;

type Props = {
  /** Trường ẩn gửi kèm mọi thao tác (ví dụ { slug } của đề, { kind: "cau", id } của câu). */
  fields: Record<string, string>;
  status: WorkflowStatus;
  reviewNote: string | null;
  /** Điều kiện: blockers chặn gửi duyệt + công bố, publishBlockers chỉ chặn công bố, warnings chỉ nhắc. */
  readiness?: { blockers: string[]; warnings: string[]; publishBlockers?: string[] };
  /** Câu hiện khi không còn điều kiện chặn (ví dụ "Đề đủ điều kiện gửi duyệt và công bố."). */
  readyLabel?: string;
  canSubmit: boolean;
  reviewActions: ReviewAction[];
  submitAction: Action;
  reviewAction: Action;
};

/** Trạng thái duyệt + điều kiện + nút gửi duyệt (biên tập viên) / duyệt (kiểm duyệt viên) — dùng cho đề, câu, tư liệu. */
export function WorkflowPanel({ fields, status, reviewNote, readiness, readyLabel, canSubmit, reviewActions, submitAction, reviewAction }: Props) {
  const [submitState, submit, submitting] = useActionState(submitAction, initialActionState);
  const [reviewState, review, reviewing] = useActionState(reviewAction, initialActionState);
  const blockers = readiness?.blockers ?? [];
  const publishBlockers = readiness?.publishBlockers ?? [];
  const ready = blockers.length === 0;
  const hidden = Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);

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

      {readiness && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm" aria-label="Điều kiện">
          {ready && publishBlockers.length === 0 && readyLabel && (
            <li className="flex items-start gap-2 text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              {readyLabel}
            </li>
          )}
          {[...blockers, ...publishBlockers].map((item) => (
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
      )}

      {/* Thông báo đặt ngoài form: gửi duyệt / trả về xong thì trạng thái đổi và form tương ứng biến mất. */}
      <FormMessage state={submitState} />
      <FormMessage state={reviewState} />

      {canSubmit && (
        <form action={submit}>
          {hidden}
          <Button type="submit" disabled={submitting || !ready}>
            {submitting ? "Đang gửi…" : "Gửi duyệt"}
          </Button>
        </form>
      )}

      {reviewActions.length > 0 && (
        <form action={review} className="flex flex-col gap-3">
          {hidden}
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
