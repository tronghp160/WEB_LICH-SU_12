"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { handleReportsAction, regradeItemAction } from "@/lib/actions/exam-quality";
import { initialActionState } from "@/lib/actions/state";

/** Đánh dấu mọi báo cáo đang mở của một câu: đã sửa / không phải lỗi (kiểm duyệt viên, quản trị viên). */
export function HandleReportsForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState(handleReportsAction, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="item_id" value={itemId} />
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Ghi chú xử lý (không bắt buộc)
        <input name="admin_note" maxLength={500} className="h-9 rounded-lg border border-border bg-surface px-2 text-foreground" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="status" value="fixed" size="sm" disabled={pending}>
          Đã sửa xong
        </Button>
        <Button type="submit" name="status" value="rejected" size="sm" variant="secondary" disabled={pending}>
          Không phải lỗi
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

/** Chấm lại câu trong mọi lượt đã nộp (quản trị viên, sau khi sửa đáp án). */
export function RegradeForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState(regradeItemAction, initialActionState);
  return (
    <form
      action={action}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        if (!window.confirm("Chấm lại câu này trong mọi lượt đã nộp theo đáp án HIỆN TẠI? Điểm của học sinh sẽ được cập nhật.")) event.preventDefault();
      }}
    >
      <input type="hidden" name="item_id" value={itemId} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="self-start">
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang chấm lại…" : "Chấm lại các lượt đã nộp"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
