"use client";

import { useActionState } from "react";
import { useNoticeAction } from "@/components/admin/ActionNotice";
import { Button } from "@/components/ui/Button";
import { initialActionState, type ActionState } from "@/lib/actions/state";
import { cn } from "@/lib/utils/cn";

type Props = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel?: string;
  /** Câu hỏi xác nhận trước khi thực hiện (thao tác khó hoàn tác). */
  confirm?: string;
  fields: Record<string, string>;
  variant?: "primary" | "secondary" | "ghost";
  danger?: boolean;
};

/**
 * Một nút thao tác quản trị: form ẩn + xác nhận + thông báo kết quả. Trong ActionNoticeScope thì thông báo hiện ở đầu
 * khung (nút có thể biến mất sau thao tác); ngoài khung thì hiện ngay dưới nút.
 */
export function OrderActionButton({ action, label, pendingLabel, confirm, fields, variant = "secondary", danger }: Props) {
  const notice = useNoticeAction(action);
  const [state, formAction, pending] = useActionState(notice.action, initialActionState);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="flex flex-col items-start gap-1.5"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" size="sm" variant={variant} disabled={pending} className={cn(danger && "text-accent")}>
        {pending ? (pendingLabel ?? "Đang xử lý…") : label}
      </Button>
      {!notice.scoped && state.status !== "idle" && state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={cn("text-sm", state.status === "error" ? "text-accent" : "text-success")}>
          {state.message}
        </p>
      )}
    </form>
  );
}
