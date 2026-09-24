"use client";

import { Lock, Unlock } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { changeStaffRoleAction, setStaffStatusAction } from "@/lib/actions/staff";
import { initialActionState } from "@/lib/actions/state";
import { accountStatusLabels, staffRoleLabels, type AccountStatus, type StaffRole } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";

export type StaffRowProps = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: StaffRole;
  status: AccountStatus;
  isSelf: boolean;
  /** Đây là quản trị viên hoạt động cuối cùng → không được khóa/hạ quyền (server và trigger DB cũng chặn). */
  isLastActiveAdmin: boolean;
};

/** Một nhân sự: đổi vai trò, khóa/mở khóa. Ràng buộc "tự khóa mình", "admin cuối cùng" được chặn cả ở giao diện lẫn server. */
export function StaffRow({ id, fullName, email, role, status, isSelf, isLastActiveAdmin }: StaffRowProps) {
  const [roleState, roleAction, changingRole] = useActionState(changeStaffRoleAction, initialActionState);
  const [statusState, statusAction, changingStatus] = useActionState(setStaffStatusAction, initialActionState);

  const locked = status === "locked";
  const protectedAccount = isSelf || isLastActiveAdmin;
  const protectedReason = isSelf
    ? "Bạn không thể tự khóa hoặc tự hạ quyền chính mình."
    : "Đây là quản trị viên hoạt động cuối cùng nên không thể khóa hoặc hạ quyền.";

  return (
    <li className={cn("flex flex-col gap-3 rounded-card border border-border bg-surface p-4", locked && "opacity-80")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-serif text-lg font-semibold text-surface-foreground">
            {fullName ?? "(chưa có tên)"}
            {isSelf && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-xs font-medium text-muted-foreground">Bạn</span>}
          </p>
          <p className="truncate text-sm text-muted-foreground">{email ?? "Email chưa hiển thị"}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            locked ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" : "bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-100",
          )}
        >
          {accountStatusLabels[status]}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <form action={roleAction} className="flex items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Vai trò
            <Select key={role} name="role" defaultValue={role} disabled={protectedAccount} className="h-9 w-52" aria-label={`Vai trò của ${fullName ?? email ?? "nhân sự"}`}>
              {Object.entries(staffRoleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" size="sm" variant="secondary" disabled={protectedAccount || changingRole}>
            {changingRole ? "Đang lưu…" : "Lưu vai trò"}
          </Button>
        </form>

        <form
          action={statusAction}
          onSubmit={(event) => {
            if (!locked && !window.confirm(`Khóa tài khoản của ${fullName ?? email ?? "nhân sự này"}? Người này sẽ mất quyền truy cập khu vực nội bộ ngay ở lần thao tác kế tiếp.`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={locked ? "active" : "locked"} />
          <Button type="submit" size="sm" variant="secondary" disabled={protectedAccount && !locked || changingStatus} className={locked ? "" : "text-accent"}>
            {locked ? <Unlock className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
            {changingStatus ? "Đang xử lý…" : locked ? "Mở khóa" : "Khóa tài khoản"}
          </Button>
        </form>
      </div>

      {protectedAccount && !locked && <p className="text-xs text-muted-foreground">{protectedReason}</p>}
      <FormMessage state={roleState} />
      <FormMessage state={statusState} />
    </li>
  );
}
