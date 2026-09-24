import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Kiểm duyệt" };

export default async function ReviewPage() {
  await requireRole(["reviewer", "system_admin"]);
  return (
    <ComingSoon
      title="Kiểm duyệt"
      description="Hàng đợi chờ duyệt: duyệt, yêu cầu chỉnh sửa, công bố hoặc ẩn nội dung."
      phase={11}
    />
  );
}
