"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { deleteSourceAction } from "@/lib/actions/content";
import { initialActionState } from "@/lib/actions/state";

/** Xóa nguồn (có hộp thoại xác nhận). Nguồn đang được sự kiện dùng sẽ bị database từ chối. */
export function DeleteSourceForm({ id, usedBy }: { id: string; usedBy: number }) {
  const [state, formAction, pending] = useActionState(deleteSourceAction, initialActionState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const warning =
          usedBy > 0
            ? `Nguồn này đang gắn với ${usedBy} sự kiện nên có thể không xóa được. Vẫn thử xóa?`
            : "Xóa nguồn này? Thao tác không thể hoàn tác.";
        if (!window.confirm(warning)) event.preventDefault();
      }}
      className="flex flex-col gap-3 rounded-card border border-border p-4"
    >
      <input type="hidden" name="id" value={id} />
      <h2 className="font-serif text-lg font-semibold text-foreground">Xóa nguồn</h2>
      <p className="text-sm text-muted-foreground">
        {usedBy > 0
          ? `Đang được ${usedBy} sự kiện sử dụng — cần gỡ nguồn khỏi các sự kiện đó trước.`
          : "Nguồn chưa được sự kiện nào sử dụng, có thể xóa."}
      </p>
      <FormMessage state={state} />
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending} className="text-accent">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {pending ? "Đang xóa…" : "Xóa nguồn"}
        </Button>
      </div>
    </form>
  );
}
