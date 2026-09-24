"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { submitForReviewAction } from "@/lib/actions/content";
import { initialActionState } from "@/lib/actions/state";
import type { ContentKind } from "@/lib/admin/content-kinds";

type SubmitForReviewPanelProps = {
  kind: ContentKind;
  id: string;
  /** Vai trò hiện tại có được gửi duyệt ở trạng thái này không (draft/needs_revision). */
  canSubmit: boolean;
  blocking: string[];
  warnings: string[];
};

/**
 * Khung "Gửi kiểm duyệt" (UC09): hiện checklist (bắt buộc / khuyến nghị) tính từ dữ liệu ĐÃ LƯU;
 * nút gửi bị khóa khi còn mục bắt buộc. Server kiểm tra lại toàn bộ khi gửi.
 */
export function SubmitForReviewPanel({ kind, id, canSubmit, blocking, warnings }: SubmitForReviewPanelProps) {
  const [state, formAction, pending] = useActionState(submitForReviewAction, initialActionState);
  const ready = blocking.length === 0;

  return (
    <section aria-labelledby="gui-duyet" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 id="gui-duyet" className="font-serif text-xl font-bold text-surface-foreground">
        Gửi kiểm duyệt
      </h2>
      <p className="text-sm text-muted-foreground">
        Kiểm tra dựa trên dữ liệu đã lưu — hãy bấm “Lưu” ở form phía trên trước khi gửi.
      </p>

      <ul className="flex flex-col gap-2 text-sm">
        {blocking.map((item) => (
          <li key={item} className="flex items-start gap-2 text-accent">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Bắt buộc: </span>
              {item}
            </span>
          </li>
        ))}
        {warnings.map((item) => (
          <li key={item} className="flex items-start gap-2 text-yellow-800 dark:text-yellow-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Nên bổ sung: </span>
              {item}
            </span>
          </li>
        ))}
        {ready && (
          <li className="flex items-start gap-2 text-green-800 dark:text-green-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Đã đủ điều kiện bắt buộc để gửi duyệt.</span>
          </li>
        )}
      </ul>

      {canSubmit ? (
        <form
          action={formAction}
          onSubmit={(event) => {
            if (!window.confirm("Gửi nội dung này cho kiểm duyệt viên? Trong lúc chờ duyệt bạn không thể chỉnh sửa.")) {
              event.preventDefault();
            }
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <FormMessage state={state} />
          <div>
            <Button type="submit" disabled={pending || !ready}>
              {pending ? "Đang gửi…" : "Gửi kiểm duyệt"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Nội dung ở trạng thái hiện tại không thể gửi duyệt.</p>
      )}
    </section>
  );
}
