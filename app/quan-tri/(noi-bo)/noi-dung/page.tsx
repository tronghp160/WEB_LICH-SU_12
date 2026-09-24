import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Nội dung" };

export default async function ContentPage() {
  await requireRole(["editor", "system_admin"]);
  return (
    <ComingSoon
      title="Nội dung"
      description="Tạo, chỉnh sửa chủ đề, sự kiện, nhân vật, địa điểm, nguồn và media."
      phase={10}
    />
  );
}
