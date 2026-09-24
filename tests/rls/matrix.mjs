// Ma trận phân quyền RLS (Phase 13, mục 8.2 KE_HOACH_DU_AN.md) trên database THẬT, 5 "vai trò": khách, editor,
// reviewer, admin, editor bị khóa. Mỗi ô của ma trận được chạy THẬT bằng phiên của vai trò đó và so với kỳ vọng.
// Cách chạy:  TEST_PW='<mật khẩu chung tài khoản @test.local>' node tests/rls/matrix.mjs
// In bảng Markdown (dán vào docs/test-report.md). Dữ liệu thử có tiền tố "zz-kiem-thu-mx" và được dọn ở cuối.
import { anon, as } from "./_client.mjs";

const ROLES = ["Khách", "Editor", "Reviewer", "Admin", "Editor bị khóa"];
const admin = await as("admin@test.local");
const clients = {
  "Khách": anon(),
  "Editor": await as("editor@test.local"),
  "Reviewer": await as("reviewer@test.local"),
  "Admin": admin,
  "Editor bị khóa": await as("locked@test.local"),
};

async function cleanup() {
  await admin.from("historical_events").delete().like("slug", "zz-kiem-thu-mx-%");
  await admin.from("sources").delete().like("title", "ZZ KIỂM THỬ MX%");
}
await cleanup();

let counter = 0;
const topicId = (await admin.from("curriculum_topics").select("id").limit(1).single()).data.id;
const baseSource = (await admin.from("sources").insert({ title: "ZZ KIỂM THỬ MX nguồn", source_type: "book", citation: "c" }).select("id").single()).data.id;

/** Tạo sự kiện thử ở trạng thái mong muốn (bằng quyền admin; cần ≥1 nguồn để rời draft — trigger G4). */
async function mkEvent(status) {
  const slug = `zz-kiem-thu-mx-${++counter}`;
  const ins = await admin.from("historical_events").insert({ topic_id: topicId, title: "ZZ MX " + slug, slug, start_year: 1954, date_text: "1954", date_precision: "year", summary: "gốc", workflow_status: "draft" }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  await admin.from("event_sources").insert({ event_id: ins.data.id, source_id: baseSource });
  if (status !== "draft") {
    const u = await admin.from("historical_events").update({ workflow_status: status }).eq("id", ins.data.id);
    if (u.error) throw new Error(status + ": " + u.error.message);
  }
  return ins.data.id;
}

const allowed = (r) => (!r.error && (Array.isArray(r.data) ? r.data.length > 0 : Boolean(r.data)) ? "✅" : "❌");
const newEventRow = (title) => ({ topic_id: topicId, title, slug: `zz-kiem-thu-mx-${++counter}`, start_year: 1954, date_text: "1954", date_precision: "year", summary: "s" });

const publishedId = await mkEvent("published");
const draftForRead = await mkEvent("draft");
const staffRows = (await admin.from("staff_profiles").select("id, role")).data;
const editorProfile = staffRows.find((r) => r.role === "editor" && r.id !== undefined);

// Mỗi thao tác: chạy bằng client của từng vai trò, trả "✅" (được) hoặc "❌" (bị chặn).
// `expected`: theo thứ tự [Khách, Editor, Reviewer, Admin, Editor bị khóa]. `note` giải thích chỗ khác với bảng mẫu trong kế hoạch.
const OPS = [
  { name: "Đọc bản `published`", expected: "✅✅✅✅✅", note: "Editor bị khóa đọc như khách",
    run: async (c) => allowed(await c.from("historical_events").select("id").eq("id", publishedId)) },
  { name: "Đọc bản `draft`", expected: "❌✅✅✅❌",
    run: async (c) => allowed(await c.from("historical_events").select("id").eq("id", draftForRead)) },
  { name: "Tạo sự kiện `draft`", expected: "❌✅❌✅❌",
    run: async (c) => allowed(await c.from("historical_events").insert({ ...newEventRow("ZZ MX tạo draft"), workflow_status: "draft" }).select("id")) },
  { name: "Tạo sự kiện `published` trực tiếp", expected: "❌❌❌❌❌",
    note: "Kế hoạch mẫu ghi Admin ✅, nhưng trigger G4 (published cần ≥1 nguồn) chặn cả Admin khi chèn thẳng — bắt buộc tạo draft, gắn nguồn rồi mới công bố",
    run: async (c) => allowed(await c.from("historical_events").insert({ ...newEventRow("ZZ MX tạo published"), workflow_status: "published" }).select("id")) },
  { name: "`draft` → `pending_review`", expected: "❌✅❌✅❌",
    run: async (c) => allowed(await c.from("historical_events").update({ workflow_status: "pending_review" }).eq("id", await mkEvent("draft")).select("id")) },
  { name: "`pending_review` → `published`", expected: "❌❌✅✅❌",
    run: async (c) => allowed(await c.from("historical_events").update({ workflow_status: "published" }).eq("id", await mkEvent("pending_review")).select("id")) },
  { name: "`pending_review` → `needs_revision`", expected: "❌❌✅✅❌",
    run: async (c) => allowed(await c.from("historical_events").update({ workflow_status: "needs_revision", review_note: "thử" }).eq("id", await mkEvent("pending_review")).select("id")) },
  { name: "Sửa NỘI DUNG bản `published`", expected: "❌❌❌✅❌",
    note: "Reviewer ❌ nhờ trigger G5 (migration 000004/000005)",
    run: async (c) => allowed(await c.from("historical_events").update({ summary: "đã sửa" }).eq("id", await mkEvent("published")).select("id")) },
  { name: "Sửa nội dung bản `draft`", expected: "❌✅❌✅❌",
    run: async (c) => allowed(await c.from("historical_events").update({ summary: "đã sửa" }).eq("id", await mkEvent("draft")).select("id")) },
  { name: "Đọc `staff_profiles` của người khác", expected: "❌❌❌✅❌",
    run: async (c) => { const r = await c.from("staff_profiles").select("id"); return !r.error && (r.data?.length ?? 0) > 1 ? "✅" : "❌"; } },
  { name: "Sửa `role` trong `staff_profiles`", expected: "❌❌❌✅❌",
    note: "Thử đặt lại đúng giá trị cũ để không làm thay đổi tài khoản thử",
    run: async (c) => allowed(await c.from("staff_profiles").update({ role: editorProfile.role }).eq("id", editorProfile.id).select("id")) },
  { name: "Thêm `sources` (nguồn mới)", expected: "❌✅✅✅❌",
    run: async (c) => allowed(await c.from("sources").insert({ title: `ZZ KIỂM THỬ MX ${++counter}`, source_type: "book", citation: "c" }).select("id")) },
  { name: "Ghi bảng liên kết của sự kiện `draft`", expected: "❌✅✅✅❌",
    run: async (c) => { const ev = await mkEvent("draft"); const src = (await admin.from("sources").insert({ title: `ZZ KIỂM THỬ MX ${++counter}`, source_type: "book", citation: "c" }).select("id").single()).data.id; return allowed(await c.from("event_sources").insert({ event_id: ev, source_id: src }).select("event_id")); } },
  { name: "Ghi bảng liên kết của sự kiện `published`", expected: "❌❌✅✅❌",
    note: "Kế hoạch mẫu ghi Editor ✅; đã siết còn ❌ bằng migration 000002 (editor chỉ ghi khi sự kiện draft/needs_revision)",
    run: async (c) => { const ev = await mkEvent("published"); const src = (await admin.from("sources").insert({ title: `ZZ KIỂM THỬ MX ${++counter}`, source_type: "book", citation: "c" }).select("id").single()).data.id; return allowed(await c.from("event_sources").insert({ event_id: ev, source_id: src }).select("event_id")); } },
];

const rows = [];
let mismatches = 0;
for (const op of OPS) {
  const actual = [];
  for (const role of ROLES) {
    try { actual.push(await op.run(clients[role])); } catch (e) { actual.push("💥"); }
  }
  const got = actual.join("");
  const match = got === op.expected;
  if (!match) mismatches++;
  rows.push({ op, actual, match });
}

// C12: updated_at đổi khi cập nhật (hai giao dịch riêng nên now() khác nhau)
const evC12 = await mkEvent("draft");
const before = (await admin.from("historical_events").select("updated_at").eq("id", evC12).single()).data.updated_at;
await new Promise((r) => setTimeout(r, 1100));
await admin.from("historical_events").update({ summary: "đổi để kiểm tra updated_at" }).eq("id", evC12);
const after = (await admin.from("historical_events").select("updated_at").eq("id", evC12).single()).data.updated_at;
const c12 = new Date(after) > new Date(before);

await cleanup();
const left = (await admin.from("historical_events").select("id").like("slug", "zz-kiem-thu-mx-%")).data.length;

// ---- Kết quả ----
console.log("| Thao tác | " + ROLES.join(" | ") + " |");
console.log("|---|" + ROLES.map(() => ":-:").join("|") + "|");
for (const { op, actual, match } of rows) {
  console.log(`| ${op.name}${match ? "" : " ⚠ LỆCH kỳ vọng " + op.expected} | ${actual.join(" | ")} |`);
}
console.log("");
for (const { op } of rows) if (op.note) console.log(`- **${op.name}**: ${op.note}`);
console.log("");
console.log(`Tổng: ${rows.length - mismatches}/${rows.length} thao tác khớp kỳ vọng (${(rows.length - mismatches) * ROLES.length}/${rows.length * ROLES.length} ô).`);
console.log(`C12 (updated_at đổi khi cập nhật, hai giao dịch riêng): ${c12 ? "ĐẠT" : "KHÔNG ĐẠT"} (${before} → ${after})`);
console.log(`Dọn dữ liệu thử: còn lại ${left} sự kiện.`);
process.exitCode = mismatches === 0 && c12 ? 0 : 1;
