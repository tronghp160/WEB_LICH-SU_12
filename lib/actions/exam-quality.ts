"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/actions/state";
import { requireRole } from "@/lib/auth";
import { examQualityPaths } from "@/lib/exams/admin";
import { examBankPaths } from "@/lib/exams/items";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Xử lý báo lỗi + chấm lại (docs/ke-hoach-luyen-thi.md, mục 4.10 — GĐ7).
//   - Đánh dấu báo cáo "đã sửa" / "không phải lỗi": kiểm duyệt viên, quản trị viên — bằng PHIÊN của họ (RLS
//     reviewer_admin_handle quyết định cuối cùng).
//   - Chấm lại: CHỈ quản trị viên (người duy nhất sửa được câu đã công bố) — kiểm vai trò rồi gọi regrade_item bằng khóa
//     bí mật, ghi người chấm vào nhật ký.

const handleSchema = z.object({
  item_id: z.guid(),
  status: z.enum(["fixed", "rejected"]),
  admin_note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự.").optional().default(""),
});

export async function handleReportsAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(["reviewer", "system_admin"]);
  const parsed = handleSchema.safeParse({ item_id: formData.get("item_id"), status: formData.get("status"), admin_note: formData.get("admin_note") ?? "" });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_item_reports")
    .update({ status: parsed.data.status, admin_note: parsed.data.admin_note || null, handled_by: staff.id, handled_at: new Date().toISOString() })
    .eq("item_id", parsed.data.item_id)
    .eq("status", "open")
    .select("id");
  if (error) return { status: "error", message: "Chưa cập nhật được báo cáo. Thử lại sau." };
  revalidatePath(examQualityPaths.reports);
  revalidatePath(examBankPaths.edit(parsed.data.item_id));
  return { status: "success", message: `Đã cập nhật ${data.length} báo cáo.` };
}

export async function regradeItemAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(["system_admin"]);
  const itemId = z.guid().safeParse(formData.get("item_id"));
  if (!itemId.success) return { status: "error", message: "Mã câu không hợp lệ." };
  const { data, error } = await createAdminClient().rpc("regrade_item", { p_item_id: itemId.data, p_actor: staff.id });
  const result = data as { ok?: boolean; attempts?: number; changed?: number } | null;
  if (error || !result?.ok) return { status: "error", message: "Chưa chấm lại được. Thử lại sau." };
  revalidatePath(examBankPaths.edit(itemId.data));
  revalidatePath(examQualityPaths.reports);
  return {
    status: "success",
    message: result.changed
      ? `Đã chấm lại: ${result.changed} / ${result.attempts} lượt đổi điểm. Học sinh thấy ghi chú trên trang kết quả.`
      : `Không lượt nào đổi điểm (${result.attempts} lượt có câu này).`,
  };
}
