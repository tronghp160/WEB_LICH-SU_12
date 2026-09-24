import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Nhân sự" };

export default async function StaffPage() {
  await requireRole(["system_admin"]);
  return (
    <ComingSoon
      title="Nhân sự"
      description="Tạo tài khoản, đổi vai trò, khóa hoặc mở khóa nhân sự."
      phase={12}
    />
  );
}
