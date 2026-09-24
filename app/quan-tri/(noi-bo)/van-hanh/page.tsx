import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Vận hành" };

export default async function OperationsPage() {
  await requireRole(["system_admin"]);
  return (
    <ComingSoon
      title="Vận hành"
      description="Thống kê nội dung, kiểm tra toàn vẹn dữ liệu và tình trạng hệ thống."
      phase={12}
    />
  );
}
