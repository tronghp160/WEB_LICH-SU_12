import type { Metadata } from "next";
import { CreateStaffForm } from "@/components/admin/staff/CreateStaffForm";
import { StaffRow } from "@/components/admin/staff/StaffRow";
import { countActiveAdmins } from "@/lib/admin/staff-rules";
import { requireRole } from "@/lib/auth";
import { listStaff } from "@/lib/queries/staff";

export const metadata: Metadata = { title: "Nhân sự" };

/** Quản lý nhân sự và vai trò (UC13): danh sách, tạo mới, đổi vai trò, khóa/mở khóa. Chỉ quản trị viên. */
export default async function StaffPage() {
  const me = await requireRole(["system_admin"]);
  const { members, emailWarning, emailsAvailable } = await listStaff();
  const activeAdmins = countActiveAdmins(members);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Nhân sự</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Tạo tài khoản, đổi vai trò, khóa hoặc mở khóa nhân sự. Tài khoản bị khóa mất toàn bộ quyền nội bộ ở lần thao tác kế tiếp.
        </p>
      </div>

      {emailWarning && (
        <p role="note" className="max-w-3xl rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-900 dark:text-orange-200">
          {emailWarning}
        </p>
      )}

      <section aria-labelledby="danh-sach-nhan-su" className="flex flex-col gap-4">
        <h2 id="danh-sach-nhan-su" className="font-serif text-xl font-bold text-foreground">
          Danh sách ({members.length})
        </h2>
        <ul className="flex max-w-3xl flex-col gap-3">
          {members.map((member) => (
            <StaffRow
              key={member.id}
              id={member.id}
              fullName={member.fullName}
              email={member.email}
              role={member.role}
              status={member.status}
              isSelf={member.id === me.id}
              isLastActiveAdmin={member.role === "system_admin" && member.status === "active" && activeAdmins <= 1}
            />
          ))}
        </ul>
      </section>

      <CreateStaffForm
        disabledReason={
          emailsAvailable
            ? null
            : "Chưa thể tạo tài khoản: máy chủ chưa có khóa quản trị (SUPABASE_SECRET_KEY) hoặc không kết nối được hệ thống đăng nhập."
        }
      />
    </div>
  );
}
