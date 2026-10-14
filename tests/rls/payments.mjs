// Ma trận phân quyền các bảng / hàm THANH TOÁN (docs/ke-hoach-tai-khoan.md, mục 3 — T4) trên database THẬT.
// Mỗi ô chạy THẬT bằng phiên của vai trò đó (khóa publishable + đăng nhập), so với kỳ vọng. Không ghi dữ liệu thật:
// thao tác ghi đều phải bị chặn; riêng "Admin sửa sản phẩm" ghi lại đúng giá trị cũ.
// Cách chạy:  TEST_PW='<mật khẩu chung tài khoản @test.local>' node tests/rls/payments.mjs
// Khi có tài khoản học sinh (docs/ke-hoach-tai-khoan.md, phần B) thêm cột "Học sinh" — kỳ vọng giống "Khách".
import { anon, as } from "./_client.mjs";

const ROLES = ["Khách", "Editor", "Reviewer", "Admin", "Editor bị khóa"];
const clients = {
  "Khách": anon(),
  "Editor": await as("editor@test.local"),
  "Reviewer": await as("reviewer@test.local"),
  "Admin": await as("admin@test.local"),
  "Editor bị khóa": await as("locked@test.local"),
};

/** ✅ khi đọc ra ít nhất một dòng. */
const readsRows = (r) => (!r.error && (r.data?.length ?? 0) > 0 ? "✅" : "❌");
/** ✅ khi câu lệnh không lỗi (dùng cho hàm / view có thể trống). */
const noError = (r) => (r.error ? "❌" : "✅");
/** ✅ khi ghi được ít nhất một dòng. */
const wrote = (r) => (!r.error && (r.data?.length ?? 0) > 0 ? "✅" : "❌");

const DEVICE = "0".repeat(64);
const KEY = "f".repeat(64);
const BAD_CODE = "LT12-AAAA-BBBB-CCCC";

const OPS = [
  // ----- Đọc -----
  { name: "Đọc `orders`", expected: "❌❌❌✅❌", run: (c) => c.from("orders").select("id").limit(1).then(readsRows) },
  { name: "Đọc `payment_events`", expected: "❌❌❌✅❌", run: (c) => c.from("payment_events").select("id").limit(1).then(readsRows) },
  { name: "Đọc `licenses`", expected: "❌❌❌✅❌", run: (c) => c.from("licenses").select("id").limit(1).then(readsRows) },
  { name: "Đọc `license_activations`", expected: "❌❌❌✅❌", run: (c) => c.from("license_activations").select("license_id").limit(1).then(readsRows) },
  { name: "Đọc `rate_limit_hits`", expected: "❌❌❌❌❌", note: "Chỉ server (service_role) đọc / ghi",
    run: (c) => c.from("rate_limit_hits").select("id").limit(1).then(noError) },
  { name: "Đọc câu hỏi `exam_questions`", expected: "❌✅✅✅❌",
    note: "Nhân sự đang hoạt động đọc được để soạn / duyệt đề (policy staff_read_all); khách chỉ lấy câu hỏi qua get_exam_set",
    run: (c) => c.from("exam_questions").select("id").limit(1).then(readsRows) },
  { name: "Đọc sản phẩm đang bán", expected: "✅✅✅✅✅", run: (c) => c.from("products").select("slug").eq("is_active", true).then(readsRows) },
  { name: "Đọc danh sách đề đã công bố", expected: "✅✅✅✅✅",
    run: (c) => c.from("exam_sets").select("slug").eq("workflow_status", "published").then(readsRows) },
  { name: "Đọc Bức tường cảm ơn", expected: "✅✅✅✅✅", run: (c) => c.from("donation_wall").select("display_name").limit(1).then(noError) },

  // ----- Ghi bảng (mọi thao tác ghi đơn / mã đi qua server bằng khóa bí mật) -----
  { name: "Tạo đơn hàng", expected: "❌❌❌❌❌",
    run: async (c) => {
      const product = (await clients.Admin.from("products").select("id").eq("slug", "goi-luyen-thi-2027").single()).data;
      return wrote(await c.from("orders").insert({ product_id: product.id, amount_vnd: 1000, provider: "mock", access_token_hash: KEY }).select("id"));
    } },
  { name: "Sửa trạng thái đơn → paid", expected: "❌❌❌❌❌",
    run: async (c) => {
      const order = (await clients.Admin.from("orders").select("id").eq("status", "cancelled").limit(1).maybeSingle()).data;
      if (!order) return "❌";
      return wrote(await c.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id).select("id"));
    } },
  { name: "Tạo mã kích hoạt", expected: "❌❌❌❌❌",
    run: async (c) => {
      const order = (await clients.Admin.from("orders").select("id, product_id").eq("status", "pending").limit(1).maybeSingle()).data;
      if (!order) return "❌";
      return wrote(await c.from("licenses").insert({ order_id: order.id, product_id: order.product_id, code: BAD_CODE, max_devices: 3 }).select("id"));
    } },
  { name: "Thêm thiết bị vào mã", expected: "❌❌❌❌❌",
    run: async (c) => {
      const license = (await clients.Admin.from("licenses").select("id").limit(1).maybeSingle()).data;
      if (!license) return "❌";
      return wrote(await c.from("license_activations").insert({ license_id: license.id, device_hash: DEVICE }).select("license_id"));
    } },
  { name: "Ghi `payment_events`", expected: "❌❌❌❌❌",
    run: (c) => c.from("payment_events").insert({ provider: "mock", source: "admin", signature_ok: true, note: "zz-kiem-thu" }).select("id").then(wrote) },
  { name: "Sửa sản phẩm (ghi lại giá trị cũ)", expected: "❌❌❌✅❌",
    run: async (c) => wrote(await c.from("products").update({ is_active: true }).eq("slug", "goi-luyen-thi-2027").select("id")) },

  // ----- Hàm nghiệp vụ: chỉ service_role -----
  { name: "Gọi `mark_order_paid`", expected: "❌❌❌❌❌",
    run: (c) => c.rpc("mark_order_paid", { p_order_code: -1, p_amount: 1000, p_provider: "mock", p_provider_ref: "zz", p_license_code: BAD_CODE }).then(noError) },
  { name: "Gọi `activate_license`", expected: "❌❌❌❌❌",
    run: (c) => c.rpc("activate_license", { p_code: BAD_CODE, p_device_hash: DEVICE }).then(noError) },
  { name: "Gọi `get_exam_set`", expected: "❌❌❌❌❌",
    run: (c) => c.rpc("get_exam_set", { p_slug: "de-2", p_code: BAD_CODE, p_device_hash: DEVICE }).then(noError) },
  { name: "Gọi `expire_stale_orders`", expected: "❌❌❌❌❌", run: (c) => c.rpc("expire_stale_orders").then(noError) },
  { name: "Gọi `consume_rate_limit`", expected: "❌❌❌❌❌",
    run: (c) => c.rpc("consume_rate_limit", { p_bucket: "order_lookup", p_key_hash: KEY, p_window_seconds: 1, p_max: 1000 }).then(noError) },
  { name: "Gọi `admin_resolve_late_payment`", expected: "❌❌❌❌❌", note: "Cần migration 20261017000000_late_payment.sql",
    run: (c) => c.rpc("admin_resolve_late_payment", { p_order_code: -1, p_staff_id: "00000000-0000-0000-0000-000000000000", p_note: "zz", p_license_code: BAD_CODE }).then(noError) },
];

const rows = [];
let mismatches = 0;
for (const op of OPS) {
  const actual = [];
  for (const role of ROLES) {
    try { actual.push(await op.run(clients[role])); } catch { actual.push("?"); }
  }
  const match = actual.join("") === op.expected;
  if (!match) mismatches++;
  rows.push({ op, actual, match });
}

// Mọi thao tác ghi ở trên đều phải bị chặn; nếu có ô LỆCH thì dữ liệu thử (ghi chú "zz-kiem-thu", mã BAD_CODE) đã lọt
// vào DB — xóa tay trong SQL Editor sau khi sửa quyền.
console.log("| Thao tác | " + ROLES.join(" | ") + " |");
console.log("|---|" + ROLES.map(() => ":-:").join("|") + "|");
for (const { op, actual, match } of rows) {
  console.log(`| ${op.name}${match ? "" : " ⚠ LỆCH kỳ vọng " + op.expected} | ${actual.join(" | ")} |`);
}
console.log("");
for (const { op } of rows) if (op.note) console.log(`- **${op.name}**: ${op.note}`);
console.log("");
console.log(`Tổng: ${rows.length - mismatches}/${rows.length} thao tác khớp kỳ vọng (${(rows.length - mismatches) * ROLES.length}/${rows.length * ROLES.length} ô).`);
process.exitCode = mismatches === 0 ? 0 : 1;
