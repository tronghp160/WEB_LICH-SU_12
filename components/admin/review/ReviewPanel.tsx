"use client";

import { AlertTriangle, EyeOff, Send, Undo2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { SourceList, type SourceListItem } from "@/components/content/SourceList";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { hideAction, publishAction, republishAction, requestRevisionAction } from "@/lib/actions/review";
import { initialActionState, type ActionState } from "@/lib/actions/state";
import type { ContentKind } from "@/lib/admin/content-kinds";
import { REASON_MAX_LENGTH, reviewActionLabels, type ReviewAction } from "@/lib/admin/review";
import type { WorkflowStatus } from "@/lib/utils/labels";

type ReviewPanelProps = {
  kind: ContentKind;
  id: string;
  status: WorkflowStatus;
  /** Hành động vai trò hiện tại được làm ở trạng thái này (tính ở server). */
  actions: ReviewAction[];
  reviewNote: string | null;
  checklist: string[];
  /** Lưu ý cho người duyệt (không chặn). */
  notes: string[];
  /** Nguồn tham khảo (chỉ sự kiện có); null = loại nội dung này không có nguồn riêng. */
  sources: (SourceListItem & { confidenceNote: string | null })[] | null;
};

/** Thông báo "nội dung đã được người khác xử lý" kèm nút tải lại (xử lý đồng thời — UC11/UC12). */
function StaleNotice({ state }: { state: ActionState }) {
  const router = useRouter();
  if (!state.stale) return null;
  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={() => router.refresh()}>
        Tải lại trang
      </Button>
    </div>
  );
}

/**
 * Cột phải của màn hình duyệt: trạng thái, ghi chú, lưu ý, nguồn, checklist đối chiếu và các nút hành động.
 * Checklist chỉ để người duyệt tự theo dõi (không lưu, không chặn công bố — đã chốt với người dùng); nếu còn mục
 * chưa tick thì hộp xác nhận khi công bố sẽ nhắc.
 */
export function ReviewPanel({ kind, id, status, actions, reviewNote, checklist, notes, sources }: ReviewPanelProps) {
  const [checked, setChecked] = useState<boolean[]>(() => checklist.map(() => false));
  const remaining = checked.filter((value) => !value).length;

  const [reviseState, reviseAction, revising] = useActionState(requestRevisionAction, initialActionState);
  const [publishState, publishForm, publishing] = useActionState(publishAction, initialActionState);
  const [hideState, hideForm, hiding] = useActionState(hideAction, initialActionState);
  const [republishState, republishForm, republishing] = useActionState(republishAction, initialActionState);

  const busy = revising || publishing || hiding || republishing;
  const has = (action: ReviewAction) => actions.includes(action);

  const hiddenFields = (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Trạng thái:</span>
        <StatusBadge status={status} />
      </div>

      {reviewNote && (
        <div role="note" className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-900 dark:text-orange-200">
          <p className="font-semibold">Ghi chú kiểm duyệt trước đó:</p>
          <p className="mt-1 whitespace-pre-line">{reviewNote}</p>
        </div>
      )}

      {notes.length > 0 && (
        <section aria-labelledby="luu-y" className="flex flex-col gap-2">
          <h2 id="luu-y" className="font-serif text-lg font-semibold text-foreground">
            Lưu ý khi duyệt
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {notes.map((note) => (
              <li key={note} className="flex items-start gap-2 text-yellow-800 dark:text-yellow-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="nguon-doi-chieu" className="flex flex-col gap-3">
        <h2 id="nguon-doi-chieu" className="font-serif text-lg font-semibold text-foreground">
          Nguồn để đối chiếu
        </h2>
        {sources ? (
          <SourceList sources={sources} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Loại nội dung này không có nguồn riêng; đối chiếu với sách giáo khoa và các nguồn của sự kiện liên quan.
          </p>
        )}
      </section>

      <section aria-labelledby="checklist" className="flex flex-col gap-3">
        <h2 id="checklist" className="font-serif text-lg font-semibold text-foreground">
          Checklist đối chiếu
        </h2>
        <p className="text-xs text-muted-foreground">Chỉ để bạn theo dõi, không lưu và không chặn thao tác.</p>
        <ul className="flex flex-col gap-2">
          {checklist.map((item, index) => (
            <li key={item}>
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={checked[index] ?? false}
                  onChange={(event) =>
                    setChecked((current) => current.map((value, i) => (i === index ? event.target.checked : value)))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="thao-tac" className="flex flex-col gap-5 border-t border-border pt-5">
        <h2 id="thao-tac" className="font-serif text-lg font-semibold text-foreground">
          Thao tác
        </h2>

        {actions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nội dung ở trạng thái này không có thao tác kiểm duyệt (chỉ xem).
          </p>
        )}

        {has("request_revision") && (
          <form action={reviseAction} noValidate className="flex flex-col gap-3">
            {hiddenFields}
            <FormMessage state={reviseState} />
            <Field
              name="reason"
              label="Lý do yêu cầu chỉnh sửa"
              required
              error={reviseState.fieldErrors?.reason}
              hint="Nêu rõ cần sửa gì để biên tập viên biết; sẽ hiển thị cho họ."
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={4}
                  maxLength={REASON_MAX_LENGTH}
                  defaultValue={reviseState.values?.reason ?? ""}
                />
              )}
            </Field>
            <StaleNotice state={reviseState} />
            <div>
              <Button type="submit" variant="secondary" disabled={busy}>
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                {revising ? "Đang gửi…" : reviewActionLabels.request_revision}
              </Button>
            </div>
          </form>
        )}

        {has("publish") && (
          <form
            action={publishForm}
            onSubmit={(event) => {
              const parts = [
                remaining > 0
                  ? `Còn ${remaining}/${checklist.length} mục đối chiếu chưa tick.`
                  : "Bạn đã tick đủ các mục đối chiếu.",
                ...notes.filter((note) => note.startsWith("Chưa công bố:")),
                "Công bố nội dung này ra trang công khai?",
              ];
              if (!window.confirm(parts.join("\n\n"))) event.preventDefault();
            }}
            className="flex flex-col gap-3"
          >
            {hiddenFields}
            <FormMessage state={publishState} />
            <StaleNotice state={publishState} />
            <div>
              <Button type="submit" disabled={busy}>
                <Send className="h-4 w-4" aria-hidden="true" />
                {publishing ? "Đang công bố…" : reviewActionLabels.publish}
              </Button>
            </div>
          </form>
        )}

        {has("hide") && (
          <form
            action={hideForm}
            onSubmit={(event) => {
              if (!window.confirm("Ẩn nội dung này? Nó sẽ biến mất khỏi trang công khai (có thể công bố lại sau).")) {
                event.preventDefault();
              }
            }}
            className="flex flex-col gap-3"
          >
            {hiddenFields}
            <FormMessage state={hideState} />
            <StaleNotice state={hideState} />
            <div>
              <Button type="submit" variant="secondary" disabled={busy} className="text-accent">
                <EyeOff className="h-4 w-4" aria-hidden="true" />
                {hiding ? "Đang ẩn…" : reviewActionLabels.hide}
              </Button>
            </div>
          </form>
        )}

        {has("republish") && (
          <form
            action={republishForm}
            onSubmit={(event) => {
              if (!window.confirm("Công bố lại nội dung này ra trang công khai?")) event.preventDefault();
            }}
            className="flex flex-col gap-3"
          >
            {hiddenFields}
            <FormMessage state={republishState} />
            <StaleNotice state={republishState} />
            <div>
              <Button type="submit" disabled={busy}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {republishing ? "Đang công bố…" : reviewActionLabels.republish}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
