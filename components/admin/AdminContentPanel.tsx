"use client";

import { EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { adminHideAction, deleteContentAction, restoreToDraftAction } from "@/lib/actions/admin-content";
import { initialActionState, type ActionState } from "@/lib/actions/state";
import { adminContentActionLabels, availableAdminContentActions } from "@/lib/admin/admin-content-rules";
import type { ContentKind } from "@/lib/admin/content-kinds";
import type { WorkflowStatus } from "@/lib/utils/labels";
import { workflowStatusLabels } from "@/lib/utils/labels";

type AdminContentPanelProps = {
  kind: ContentKind;
  id: string;
  status: WorkflowStatus;
  title: string;
};

function Stale({ state }: { state: ActionState }) {
  const router = useRouter();
  if (!state.stale) return null;
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => router.refresh()}>
      Tải lại trang
    </Button>
  );
}

/** Chỉ hiện lỗi ngay dưới form; thông báo THÀNH CÔNG hiện ở đầu khung (xem `notice`) vì form có thể biến mất sau khi đổi trạng thái. */
const errorOnly = (state: ActionState): ActionState => (state.status === "error" ? state : initialActionState);

/**
 * Khung thao tác của QUẢN TRỊ VIÊN trên một nội dung (UC14): khôi phục về nháp, ẩn, xóa vĩnh viễn.
 * Ưu tiên "Ẩn" hơn "Xóa": nút xóa nằm cuối, có hộp thoại xác nhận, và bị khóa ngoại chặn nếu còn được dùng.
 */
export function AdminContentPanel({ kind, id, status, title }: AdminContentPanelProps) {
  // Sau mỗi thao tác, trang được làm mới với trạng thái mới → các nút khả dụng thay đổi, form vừa bấm có thể biến mất.
  // Vì vậy thông báo thành công được giữ ở cấp khung thay vì trong từng form.
  const [notice, setNotice] = useState<string | null>(null);
  const track = (action: (previous: ActionState, formData: FormData) => Promise<ActionState>) =>
    async (previous: ActionState, formData: FormData) => {
      setNotice(null);
      const result = await action(previous, formData);
      if (result.status === "success") setNotice(result.message ?? null);
      return result;
    };

  const [restoreState, restoreForm, restoring] = useActionState(track(restoreToDraftAction), initialActionState);
  const [hideState, hideForm, hiding] = useActionState(track(adminHideAction), initialActionState);
  const [deleteState, deleteForm, deleting] = useActionState(deleteContentAction, initialActionState);

  const actions = availableAdminContentActions(status);
  const busy = restoring || hiding || deleting;

  const hidden = (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
    </>
  );

  return (
    <section aria-labelledby="quan-tri-noi-dung" className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5">
      <div>
        <h2 id="quan-tri-noi-dung" className="font-serif text-xl font-bold text-surface-foreground">
          Quản trị nội dung
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dành cho quản trị viên. Nên <strong>ẩn</strong> thay vì xóa: nội dung ẩn vẫn còn để khôi phục khi cần.
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-lg border border-green-600/40 bg-green-600/10 px-4 py-3 text-sm font-medium text-green-800 dark:text-green-300">
          {notice}
        </p>
      )}

      {actions.includes("restore_draft") && (
        <form
          action={restoreForm}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Khôi phục “${title}” về bản nháp? Hiện đang “${workflowStatusLabels[status]}”; nội dung sẽ không còn hiển thị ở trang công khai.`,
              )
            ) {
              event.preventDefault();
            }
          }}
          className="flex flex-col gap-3"
        >
          {hidden}
          <FormMessage state={errorOnly(restoreState)} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" disabled={busy}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {restoring ? "Đang khôi phục…" : adminContentActionLabels.restore_draft}
            </Button>
            <Stale state={restoreState} />
          </div>
        </form>
      )}

      {actions.includes("hide") && (
        <form
          action={hideForm}
          onSubmit={(event) => {
            if (!window.confirm(`Ẩn “${title}” khỏi trang công khai? Có thể khôi phục về nháp hoặc công bố lại sau.`)) {
              event.preventDefault();
            }
          }}
          className="flex flex-col gap-3"
        >
          {hidden}
          <FormMessage state={errorOnly(hideState)} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" disabled={busy}>
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              {hiding ? "Đang ẩn…" : adminContentActionLabels.hide}
            </Button>
            <Stale state={hideState} />
          </div>
        </form>
      )}

      {actions.includes("delete") && (
        <form
          action={deleteForm}
          onSubmit={(event) => {
            const warning =
              status === "published"
                ? `“${title}” ĐANG được công bố. Xóa vĩnh viễn sẽ làm nó biến mất khỏi trang công khai và KHÔNG thể hoàn tác. Nên ẩn thay vì xóa.\n\nVẫn xóa vĩnh viễn?`
                : `Xóa vĩnh viễn “${title}”? Thao tác không thể hoàn tác (nên ẩn nếu chưa chắc).`;
            if (!window.confirm(warning)) event.preventDefault();
          }}
          className="flex flex-col gap-3 border-t border-border pt-5"
        >
          {hidden}
          <FormMessage state={deleteState} />
          <div>
            <Button type="submit" variant="secondary" disabled={busy} className="text-accent">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {deleting ? "Đang xóa…" : adminContentActionLabels.delete}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
