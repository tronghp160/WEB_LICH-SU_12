"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/state";
import { reconcileOrder } from "@/lib/payments/orders";
import { createAdminClient } from "@/lib/supabase/admin";

// Thao tác của QUẢN TRỊ VIÊN trên đơn hàng (docs/ke-hoach-thanh-toan.md, mục 10). Khách và nhân sự khác không có quyền
// ghi bảng thanh toán (RLS chỉ cho đọc), nên sau khi requireRole(["system_admin"]) mới ghi bằng khóa bí mật — giống mẫu
// tạo tài khoản nhân sự (UC13). Mọi thao tác đều ghi payment_events(source = 'admin') kèm người thực hiện.

type Db = ReturnType<typeof createAdminClient>;

const adminPath = (orderCode: number) => `/quan-tri/don-hang/${orderCode}`;

function readOrderCode(formData: FormData): number | null {
  const value = Number(formData.get("don"));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function loadOrder(db: Db, orderCode: number) {
  const { data } = await db
    .from("orders")
    .select("id, order_code, status, provider, show_on_wall, wall_approved, licenses(id, status)")
    .eq("order_code", orderCode)
    .maybeSingle();
  return data;
}

async function logAdmin(db: Db, orderCode: number, provider: string, action: string, staffId: string, extra: Record<string, string> = {}) {
  await db.from("payment_events").insert({
    order_code: orderCode,
    provider,
    source: "admin",
    signature_ok: true,
    note: action,
    payload: { action, by: staffId, ...extra },
  });
}

const fail = (message: string): ActionState => ({ status: "error", message });
const done = (orderCode: number, message: string): ActionState => {
  revalidatePath(adminPath(orderCode));
  revalidatePath("/quan-tri/don-hang");
  return { status: "success", message };
};

/** Hỏi lại cổng thanh toán trạng thái thật của đơn (khi webhook không tới). */
export async function adminReconcileAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(["system_admin"]);
  const orderCode = readOrderCode(formData);
  if (!orderCode) return fail("Mã đơn không hợp lệ.");
  const outcome = await reconcileOrder(orderCode, "admin", `reconcile_by:${staff.id}`);
  switch (outcome) {
    case "paid":
      return done(orderCode, "Cổng xác nhận đã thanh toán — đơn đã chuyển sang Đã thanh toán.");
    case "cancelled":
      return done(orderCode, "Cổng báo giao dịch đã hủy — đơn đã chuyển sang Đã hủy.");
    case "rejected":
      return done(orderCode, "Cổng báo đã thanh toán nhưng đơn bị từ chối (sai số tiền hoặc trạng thái) — xem nhật ký.");
    case "unchanged":
      return { status: "success", message: "Cổng chưa có kết quả mới cho đơn này." };
    default:
      return fail("Không hỏi được cổng thanh toán (chưa cấu hình hoặc mất kết nối).");
  }
}

/** Thu hồi mã kích hoạt: mọi máy đã kích hoạt mất quyền làm đề ở lần tải đề tiếp theo. */
export async function adminRevokeLicenseAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(["system_admin"]);
  const orderCode = readOrderCode(formData);
  if (!orderCode) return fail("Mã đơn không hợp lệ.");
  const db = createAdminClient();
  const order = await loadOrder(db, orderCode);
  if (!order?.licenses) return fail("Đơn này không có mã kích hoạt.");
  if (order.licenses.status === "revoked") return fail("Mã đã bị thu hồi từ trước.");
  const { error } = await db.from("licenses").update({ status: "revoked" }).eq("id", order.licenses.id).eq("status", "active");
  if (error) return fail("Không thu hồi được mã. Thử lại sau.");
  await logAdmin(db, orderCode, order.provider, "revoke_license", staff.id);
  return done(orderCode, "Đã thu hồi mã kích hoạt.");
}

/** Mở lại mã đã thu hồi nhầm (chỉ khi đơn vẫn ở trạng thái đã thanh toán). */
export async function adminRestoreLicenseAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(["system_admin"]);
  const orderCode = readOrderCode(formData);
  if (!orderCode) return fail("Mã đơn không hợp lệ.");
  const db = createAdminClient();
  const order = await loadOrder(db, orderCode);
  if (!order?.licenses) return fail("Đơn này không có mã kích hoạt.");
  if (order.status !== "paid") return fail("Chỉ mở lại mã của đơn đang ở trạng thái Đã thanh toán.");
  if (order.licenses.status === "active") return fail("Mã đang hoạt động.");
  const { error } = await db.from("licenses").update({ status: "active" }).eq("id", order.licenses.id);
  if (error) return fail("Không mở lại được mã. Thử lại sau.");
  await logAdmin(db, orderCode, order.provider, "restore_license", staff.id);
  return done(orderCode, "Đã mở lại mã kích hoạt.");
}

/** Gỡ một thiết bị để người mua kích hoạt máy mới (khi đã dùng hết lượt). */
export async function adminRemoveDeviceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(["system_admin"]);
  const orderCode = readOrderCode(formData);
  const device = String(formData.get("thiet-bi") ?? "");
  if (!orderCode || !/^[0-9a-f]{64}$/.test(device)) return fail("Thông tin thiết bị không hợp lệ.");
  const db = createAdminClient();
  const order = await loadOrder(db, orderCode);
  if (!order?.licenses) return fail("Đơn này không có mã kích hoạt.");
  const { data, error } = await db
    .from("license_activations")
    .delete()
    .eq("license_id", order.licenses.id)
    .eq("device_hash", device)
    .select("device_hash");
  if (error) return fail("Không gỡ được thiết bị. Thử lại sau.");
  if (!data || data.length === 0) return fail("Thiết bị không còn trong danh sách.");
  await logAdmin(db, orderCode, order.provider, "remove_device", staff.id, { device: device.slice(0, 12) });
  return done(orderCode, "Đã gỡ thiết bị. Người mua có thể kích hoạt thêm một máy.");
}

/**
 * Ghi nhận đã hoàn tiền (việc hoàn tiền làm ngoài hệ thống, ở cổng/ngân hàng): đơn → Đã hoàn tiền, mã bị thu hồi.
 * Trigger order_integrity chỉ cho phép paid → refunded.
 */
export async function adminRecordRefundAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(["system_admin"]);
  const orderCode = readOrderCode(formData);
  if (!orderCode) return fail("Mã đơn không hợp lệ.");
  const db = createAdminClient();
  const order = await loadOrder(db, orderCode);
  if (!order) return fail("Không tìm thấy đơn hàng.");
  if (order.status !== "paid") return fail("Chỉ ghi nhận hoàn tiền cho đơn đã thanh toán.");
  const { data, error } = await db.from("orders").update({ status: "refunded" }).eq("id", order.id).eq("status", "paid").select("id");
  if (error || !data || data.length === 0) return fail("Không cập nhật được đơn (có thể đã có người xử lý). Tải lại trang.");
  if (order.licenses?.status === "active") await db.from("licenses").update({ status: "revoked" }).eq("id", order.licenses.id);
  await logAdmin(db, orderCode, order.provider, "record_refund", staff.id);
  return done(orderCode, "Đã ghi nhận hoàn tiền và thu hồi mã (nếu có).");
}

/** Duyệt / gỡ lời nhắn ủng hộ trên Bức tường cảm ơn (chỉ với người ủng hộ đã chọn "hiện trên bức tường"). */
export async function adminWallAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(["system_admin"]);
  const orderCode = readOrderCode(formData);
  const approve = formData.get("quyet-dinh") === "duyet";
  if (!orderCode) return fail("Mã đơn không hợp lệ.");
  const db = createAdminClient();
  const order = await loadOrder(db, orderCode);
  if (!order) return fail("Không tìm thấy đơn hàng.");
  if (!order.show_on_wall) return fail("Người ủng hộ không chọn hiện trên Bức tường cảm ơn.");
  if (order.status !== "paid") return fail("Chỉ hiện lời nhắn của khoản ủng hộ đã thanh toán.");
  const { error } = await db.from("orders").update({ wall_approved: approve }).eq("id", order.id);
  if (error) return fail("Không cập nhật được. Thử lại sau.");
  await logAdmin(db, orderCode, order.provider, approve ? "wall_approve" : "wall_hide", staff.id);
  revalidatePath("/ung-ho");
  return done(orderCode, approve ? "Đã duyệt — lời nhắn hiện trên Bức tường cảm ơn." : "Đã gỡ lời nhắn khỏi Bức tường cảm ơn.");
}
