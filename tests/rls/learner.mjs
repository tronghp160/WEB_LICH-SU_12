// Tài khoản HỌC SINH không có quyền nội bộ và không đụng được dữ liệu của nhau (docs/ke-hoach-tai-khoan.md, mục 4.3, 10,
// 12 — giai đoạn B7). Chạy THẬT trên database bằng phiên học sinh (khóa publishable + đăng nhập), so với khách.
// Hai tài khoản học sinh thử zz-kiem-thu-rls-hs-*@test.local được tạo bằng Admin API (SUPABASE_SECRET_KEY trong
// .env.local) và XÓA ở cuối. Có TEST_PW thì chạy thêm cột so sánh quản trị viên / biên tập viên.
// Cách chạy:  node tests/rls/learner.mjs        (hoặc TEST_PW='…' node tests/rls/learner.mjs)
// Không ghi dữ liệu nội dung thật: mọi thao tác ghi vào bảng nội dung / thanh toán đều phải bị chặn.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { anon, as, URL_ } from "./_client.mjs";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);
const SECRET = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!SECRET) {
  console.error("Cần SUPABASE_SECRET_KEY trong .env.local để tạo / dọn tài khoản học sinh thử.");
  process.exit(1);
}
const service = createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

const PREFIX = "zz-kiem-thu-rls-hs-";
const PASSWORD = `Lichsu${Date.now().toString(36)}9`;
const TERMS = "2026-10";

async function cleanup() {
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data?.users ?? []) if (user.email?.startsWith(PREFIX)) await service.auth.admin.deleteUser(user.id);
}

/** Tạo học sinh thử, đăng nhập bằng khóa publishable, tự tạo hồ sơ (RLS own_insert) như server làm. */
async function learner(tag) {
  const email = `${PREFIX}${tag}-${Date.now().toString(36)}@test.local`;
  const created = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: `ZZ RLS ${tag}`, terms_version: TERMS },
  });
  if (created.error) throw new Error(`createUser: ${created.error.message}`);
  const client = anon();
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  const id = created.data.user.id;
  const profile = await client.from("learner_profiles").insert({ id, display_name: `ZZ RLS ${tag}`, terms_version: TERMS });
  if (profile.error) throw new Error(`hồ sơ ${tag}: ${profile.error.message}`);
  const progress = await client.from("learner_progress").insert({ user_id: id, data: { v: 1, lessons: {}, quizzes: {}, sgk: {} } });
  if (progress.error) throw new Error(`tiến độ ${tag}: ${progress.error.message}`);
  return { id, email, client };
}

await cleanup();
const A = await learner("a");
const B = await learner("b");
const withStaff = Boolean(process.env.TEST_PW);
const staff = withStaff ? { Editor: await as("editor@test.local"), Admin: await as("admin@test.local") } : {};

// Dữ liệu tham chiếu (đọc bằng khóa bí mật — chỉ để lấy id, không sửa gì).
const one = async (query) => (await query).data?.[0] ?? null;
const published = await one(service.from("historical_events").select("id").eq("workflow_status", "published").limit(1));
const draft = await one(service.from("historical_events").select("id").neq("workflow_status", "published").limit(1));
const topic = await one(service.from("curriculum_topics").select("id").limit(1));
const anyStaff = await one(service.from("staff_profiles").select("id").limit(1));
const product = await one(service.from("products").select("id, price_vnd").eq("kind", "exam_pack").limit(1));
const examSet = await one(service.from("exam_sets").select("id, slug").limit(1));

// Tiền điều kiện: mọi dữ liệu tham chiếu phải có thật — nếu không, ô "❌ bị chặn" có thể chỉ vì bảng trống / id null.
const counts = {};
for (const table of ["exam_questions", "orders", "licenses", "staff_profiles"]) {
  counts[table] = (await service.from(table).select("*", { count: "exact", head: true })).count ?? 0;
}
const missing = [
  ["sự kiện published", published], ["sự kiện chưa công bố", draft], ["chủ đề", topic], ["hồ sơ nhân sự", anyStaff],
  ["sản phẩm gói", product], ["đề luyện thi", examSet],
].filter(([, value]) => !value).map(([name]) => name);
for (const [table, count] of Object.entries(counts)) if (count === 0) missing.push(`bảng ${table} trống`);
if (missing.length) {
  console.error(`Thiếu dữ liệu tham chiếu: ${missing.join(", ")} — kết quả "bị chặn" sẽ không có ý nghĩa.`);
  await cleanup();
  process.exit(1);
}

const rows = (r) => (!r.error && (Array.isArray(r.data) ? r.data.length > 0 : Boolean(r.data)) ? "✅" : "❌");
const ok = (r) => (r.error ? "❌" : "✅");
/**
 * Lệnh ghi / gọi hàm: chỉ tính "❌ bị chặn" khi lỗi đúng là thiếu quyền (42501 — RLS hoặc không có quyền EXECUTE). Lỗi
 * khác (thiếu cột, sai kiểu…) ghi ⚠ — không để lỗi dữ liệu che mất việc RLS có chặn hay không.
 */
const denied = (r) => (!r.error ? (Array.isArray(r.data) && r.data.length === 0 ? "❌" : "✅") : r.error.code === "42501" ? "❌" : "⚠");

// expected: [Khách, Học sinh] (+ [Editor, Admin] khi có TEST_PW, ghi ở `staff`).
const OPS = [
  // ----- Nội dung: học sinh = khách -----
  { name: "Đọc sự kiện `published`", expected: "✅✅", run: (c) => c.from("historical_events").select("id").eq("id", published.id).then(rows) },
  { name: "Đọc sự kiện chưa công bố", expected: "❌❌", staff: "✅✅", run: (c) => c.from("historical_events").select("id").eq("id", draft.id).then(rows) },
  { name: "Tạo sự kiện", expected: "❌❌",
    run: (c) => c.from("historical_events").insert({ topic_id: topic.id, title: "ZZ RLS HS", slug: `zz-kiem-thu-rls-hs-${Date.now()}`, start_year: 1954, date_text: "1954", date_precision: "year", summary: "s", workflow_status: "draft" }).select("id").then(denied) },
  { name: "Sửa sự kiện `published`", expected: "❌❌", run: (c) => c.from("historical_events").update({ summary: "x" }).eq("id", published.id).select("id").then(rows) },
  { name: "Thêm `sources`", expected: "❌❌", run: (c) => c.from("sources").insert({ title: "ZZ KIỂM THỬ RLS HS", source_type: "book", citation: "c" }).select("id").then(denied) },
  { name: "Đọc `staff_profiles` (của người khác)", expected: "❌❌", staff: "❌✅", run: (c) => c.from("staff_profiles").select("id").eq("id", anyStaff.id).then(rows) },
  { name: "Tự chèn hồ sơ nhân sự cho mình (leo quyền)", expected: "❌❌",
    note: "Không có policy insert cho authenticated — học sinh không tự cấp quyền nội bộ",
    run: async (c) => { const { data } = await c.auth.getUser(); return c.from("staff_profiles").insert({ id: data.user?.id ?? "00000000-0000-0000-0000-000000000000", full_name: "ZZ", role: "system_admin" }).select("id").then(denied); } },
  { name: "`current_staff_role()` trả vai trò", expected: "❌❌", note: "Học sinh nhận null như khách",
    run: (c) => c.rpc("current_staff_role").then((r) => (!r.error && r.data ? "✅" : "❌")) },
  { name: "Tải ảnh lên Storage `media`", expected: "❌❌",
    run: (c) => c.storage.from("media").upload(`zz-kiem-thu-rls-hs/${Date.now()}.txt`, new Blob(["x"], { type: "text/plain" })).then(ok) },
  { name: "Đọc câu hỏi đề `exam_questions`", expected: "❌❌", staff: "✅✅", run: (c) => c.from("exam_questions").select("id").limit(1).then(rows) },
  { name: "Sửa đề `exam_sets`", expected: "❌❌", run: (c) => c.from("exam_sets").update({ title: "x" }).eq("id", examSet.id).select("id").then(rows) },
  // ----- Thanh toán: đóng với học sinh -----
  { name: "Đọc `orders`", expected: "❌❌", staff: "❌✅", run: (c) => c.from("orders").select("id").limit(1).then(rows) },
  { name: "Đọc `licenses`", expected: "❌❌", staff: "❌✅", run: (c) => c.from("licenses").select("id").limit(1).then(rows) },
  { name: "Tạo đơn trực tiếp", expected: "❌❌",
    run: (c) => c.from("orders").insert({ product_id: product.id, amount_vnd: product.price_vnd, provider: "mock", access_token_hash: "f".repeat(64) }).select("id").then(denied) },
  { name: "Gọi `claim_license`", expected: "❌❌", note: "Chỉ service_role — server gọi sau khi xác minh phiên",
    run: (c) => c.rpc("claim_license", { p_code: "LT12-AAAA-BBBB-CCCC", p_user_id: A.id }).then(denied) },
  { name: "Gọi `get_exam_set` (tự khai user id)", expected: "❌❌", note: "Không ai tự khai p_user_id được: hàm chỉ service_role",
    run: (c) => c.rpc("get_exam_set", { p_slug: examSet.slug, p_code: "", p_device_hash: "", p_user_id: A.id }).then(denied) },
  { name: "Gọi `find_auth_user_by_email`", expected: "❌❌", run: (c) => c.rpc("find_auth_user_by_email", { p_email: A.email }).then(denied) },
  { name: "Gọi `consume_rate_limit`", expected: "❌❌", run: (c) => c.rpc("consume_rate_limit", { p_bucket: "license_claim", p_key_hash: "x", p_window_seconds: 60, p_max: 1 }).then(denied) },
  // ----- Hồ sơ / tiến độ học sinh: chỉ của mình -----
  { name: "Đọc hồ sơ học sinh B", expected: "❌❌", staff: "❌✅", note: "Học sinh A không thấy B; quản trị viên chỉ đọc (admin_read)",
    run: (c) => c.from("learner_profiles").select("id").eq("id", B.id).then(rows) },
  { name: "Sửa hồ sơ học sinh B", expected: "❌❌", staff: "❌❌", run: (c) => c.from("learner_profiles").update({ display_name: "ZZ bị sửa" }).eq("id", B.id).select("id").then(rows) },
  { name: "Đọc tiến độ học sinh B", expected: "❌❌", staff: "❌❌", run: (c) => c.from("learner_progress").select("user_id").eq("user_id", B.id).then(rows) },
  { name: "Ghi tiến độ cho B", expected: "❌❌", staff: "❌❌", run: (c) => c.from("learner_progress").update({ data: { v: 1, lessons: {}, quizzes: {}, sgk: {} } }).eq("user_id", B.id).select("user_id").then(rows) },
];

const roles = ["Khách", "Học sinh", ...(withStaff ? ["Editor", "Admin"] : [])];
const clients = { "Khách": anon(), "Học sinh": A.client, ...staff };
const results = [];
let mismatches = 0;
for (const op of OPS) {
  const expected = op.expected + (withStaff ? (op.staff ?? "❌❌") : "");
  const actual = [];
  for (const role of roles) {
    try {
      actual.push(await op.run(clients[role]));
    } catch {
      // Ném lỗi ≠ bị RLS chặn: ghi ⚠ để lộ ra thành "lệch kỳ vọng" thay vì đạt nhầm.
      actual.push("⚠");
    }
  }
  const match = actual.join("") === expected;
  if (!match) mismatches++;
  results.push({ op, actual, match, expected });
}

// ----- Ca riêng của chủ tài khoản (phải ĐƯỢC) -----
const own = [
  ["A đọc hồ sơ của mình", rows(await A.client.from("learner_profiles").select("id").eq("id", A.id))],
  ["A sửa tên hiển thị của mình", rows(await A.client.from("learner_profiles").update({ display_name: "ZZ RLS a2" }).eq("id", A.id).select("id"))],
  ["A đọc / ghi tiến độ của mình", rows(await A.client.from("learner_progress").update({ data: { v: 1, lessons: {}, quizzes: {}, sgk: {} } }).eq("user_id", A.id).select("user_id"))],
  ["A KHÔNG đổi được id hồ sơ sang B", (await A.client.from("learner_profiles").update({ id: B.id }).eq("id", A.id).select("id")).error ? "✅" : "❌"],
  ["A KHÔNG xóa được hồ sơ của mình (chỉ xóa theo tài khoản)", rows(await A.client.from("learner_profiles").delete().eq("id", A.id).select("id")) === "❌" ? "✅" : "❌"],
];
const ownFails = own.filter(([, mark]) => mark !== "✅").length;

// Xóa tài khoản → hồ sơ + tiến độ đi theo (cascade).
await service.auth.admin.deleteUser(B.id);
const cascade = !(await service.from("learner_profiles").select("id").eq("id", B.id)).data?.length && !(await service.from("learner_progress").select("user_id").eq("user_id", B.id)).data?.length;

await cleanup();
const leftUsers = ((await service.auth.admin.listUsers({ perPage: 1000 })).data?.users ?? []).filter((u) => u.email?.startsWith(PREFIX)).length;
const leftEvents = (await service.from("historical_events").select("id").like("slug", "zz-kiem-thu-rls-hs-%")).data?.length ?? 0;

console.log(`| Thao tác | ${roles.join(" | ")} |`);
console.log(`|---|${roles.map(() => ":-:").join("|")}|`);
for (const { op, actual, match, expected } of results) console.log(`| ${op.name}${match ? "" : ` ⚠ LỆCH kỳ vọng ${expected}`} | ${actual.join(" | ")} |`);
console.log("");
for (const { op } of results) if (op.note) console.log(`- **${op.name}**: ${op.note}`);
console.log("");
for (const [name, mark] of own) console.log(`- ${mark} ${name}`);
console.log(`- ${cascade ? "✅" : "❌"} Xóa tài khoản B → hồ sơ và tiến độ của B bị xóa theo`);
console.log("");
console.log(`Tổng: ${results.length - mismatches}/${results.length} thao tác khớp kỳ vọng (${(results.length - mismatches) * roles.length}/${results.length * roles.length} ô); ca chủ tài khoản ${own.length - ownFails}/${own.length}; cascade ${cascade ? "đạt" : "KHÔNG ĐẠT"}.`);
console.log(`Dọn dữ liệu thử: còn ${leftUsers} tài khoản, ${leftEvents} sự kiện.${withStaff ? "" : " (Chưa có TEST_PW → bỏ cột Editor / Admin.)"}`);
process.exitCode = mismatches === 0 && ownFails === 0 && cascade && leftUsers === 0 && leftEvents === 0 ? 0 : 1;
