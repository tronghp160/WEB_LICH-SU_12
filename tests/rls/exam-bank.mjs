// Ma trận phân quyền NGÂN HÀNG CÂU HỎI luyện thi (docs/ke-hoach-luyen-thi.md, GĐ1; migration 20261025000000_exam_bank.sql)
// trên database THẬT. Mỗi ô chạy THẬT bằng phiên của vai trò đó (khóa publishable + đăng nhập), so với kỳ vọng.
// Chỉ ghi vào DỮ LIỆU THỬ do script tự tạo bằng khóa bí mật (câu / tư liệu "ZZ KIỂM THỬ", đề "zz-kiem-thu-*" ở trạng thái
// nháp / đã ẩn — không bao giờ hiện ở trang công khai) và dọn hết ở cuối, kể cả khi lỗi.
// Cách chạy:  TEST_PW='<mật khẩu chung tài khoản @test.local>' node tests/rls/exam-bank.mjs
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { anon, as, URL_ } from "./_client.mjs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((line) => line.includes("=") && !line.startsWith("#")).map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);
const service = createClient(URL_, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// Không dùng head: true — khi bảng chưa có, truy vấn HEAD trả về không lỗi, count null.
const ready = await service.from("exam_items").select("id").limit(1);
if (ready.error) {
  throw new Error(`Chưa chạy được: ${ready.error.message}. Chạy migration supabase/migrations/20261025000000_exam_bank.sql trước.`);
}

const ROLES = ["Khách", "Editor", "Reviewer", "Admin", "Editor bị khóa"];
const clients = {
  "Khách": anon(),
  "Editor": await as("editor@test.local"),
  "Reviewer": await as("reviewer@test.local"),
  "Admin": await as("admin@test.local"),
  "Editor bị khóa": await as("locked@test.local"),
};

const PREFIX = "ZZ KIỂM THỬ ngân hàng";
const run = Date.now().toString(36);
let counter = 0;
/** Câu trắc nghiệm thử, câu hỏi khác nhau mỗi lần (dấu vân tay là UNIQUE). */
const item = (status = "draft") => ({
  kind: "mcq",
  stem: `${PREFIX} ${run} câu ${++counter}?`,
  choices: ["Một", "Hai", "Ba", "Bốn"],
  correct_index: 0,
  explanation: "Giải thích thử",
  level: "nhan_biet",
  competency: "tim_hieu_lich_su",
  source_note: "Kiểm thử RLS",
  workflow_status: status,
});
async function fixture(status) {
  const { data, error } = await service.from("exam_items").insert(item(status)).select("id").single();
  if (error) throw new Error(`Không tạo được câu thử: ${error.message}`);
  return data.id;
}
async function fixtureSet(status) {
  const { data, error } = await service.from("exam_sets").insert({ slug: `zz-kiem-thu-${run}-${++counter}`, title: `${PREFIX} đề`, format: "mini", workflow_status: status }).select("id").single();
  if (error) throw new Error(`Không tạo được đề thử: ${error.message}`);
  return data.id;
}

/** ✅ khi đọc ra ít nhất một dòng. */
const readsRows = (r) => (!r.error && (r.data?.length ?? 0) > 0 ? "✅" : "❌");
/** ✅ khi ghi được ít nhất một dòng. */
const wrote = (r) => (!r.error && (r.data?.length ?? 0) > 0 ? "✅" : "❌");

async function cleanup() {
  const { data: sets } = await service.from("exam_sets").select("id").like("slug", "zz-kiem-thu-%");
  const setIds = (sets ?? []).map((set) => set.id);
  if (setIds.length > 0) {
    await service.from("exam_set_items").delete().in("set_id", setIds);
    await service.from("exam_sets").delete().in("id", setIds);
  }
  await service.from("exam_items").delete().like("stem", `${PREFIX}%`);
  await service.from("exam_passages").delete().like("title", `${PREFIX}%`);
}

let mismatches = 0;
const rows = [];
try {
  const draftSet = await fixtureSet("draft");
  const hiddenSet = await fixtureSet("hidden");
  const draftItem = await fixture("draft");
  const publishedItem = await fixture("published");
  await service.from("exam_passages").insert({ title: `${PREFIX} tư liệu`, body: "Đoạn tư liệu thử đủ ba mươi ký tự cho ràng buộc độ dài.", source_citation: "Kiểm thử RLS" });
  await service.from("exam_set_items").insert({ set_id: draftSet, item_id: publishedItem, section: 1, position: 1 });

  const OPS = [
    // ----- Đọc -----
    { name: "Đọc `exam_items`", expected: "❌✅✅✅❌", note: "Khách / học sinh không đọc được câu hỏi + đáp án; chỉ lấy câu qua get_exam_set (server)",
      run: (c) => c.from("exam_items").select("id").like("stem", `${PREFIX}%`).limit(1).then(readsRows) },
    { name: "Đọc `exam_passages`", expected: "❌✅✅✅❌", run: (c) => c.from("exam_passages").select("id").like("title", `${PREFIX}%`).limit(1).then(readsRows) },
    { name: "Đọc `exam_set_items`", expected: "❌✅✅✅❌", run: (c) => c.from("exam_set_items").select("item_id").eq("set_id", draftSet).then(readsRows) },
    // ----- Ghi câu -----
    { name: "Tạo câu nháp", expected: "❌✅✅✅❌", run: (c) => c.from("exam_items").insert(item("draft")).select("id").then(wrote) },
    { name: "Tạo câu ở trạng thái đã công bố", expected: "❌❌✅✅❌", note: "Biên tập viên không tự công bố",
      run: (c) => c.from("exam_items").insert(item("published")).select("id").then(wrote) },
    { name: "Sửa câu nháp", expected: "❌✅✅✅❌", run: (c) => c.from("exam_items").update({ explanation: `Giải thích sửa ${++counter}` }).eq("id", draftItem).select("id").then(wrote) },
    { name: "Sửa câu đã công bố", expected: "❌❌✅✅❌", note: "Biên tập viên chỉ sửa câu nháp / cần chỉnh sửa (giao diện chặn thêm kiểm duyệt viên sửa nội dung)",
      run: (c) => c.from("exam_items").update({ explanation: `Giải thích sửa ${++counter}` }).eq("id", publishedItem).select("id").then(wrote) },
    { name: "Gửi duyệt câu nháp (draft → pending_review)", expected: "❌✅✅✅❌",
      run: async (c) => wrote(await c.from("exam_items").update({ workflow_status: "pending_review" }).eq("id", await fixture("draft")).select("id")) },
    { name: "Công bố câu chờ duyệt", expected: "❌❌✅✅❌",
      run: async (c) => wrote(await c.from("exam_items").update({ workflow_status: "published" }).eq("id", await fixture("pending_review")).select("id")) },
    { name: "Xóa câu nháp", expected: "❌✅✅✅❌", run: async (c) => wrote(await c.from("exam_items").delete().eq("id", await fixture("draft")).select("id")) },
    // ----- Ghép đề -----
    { name: "Thêm câu vào đề nháp", expected: "❌✅✅✅❌",
      run: async (c) => wrote(await c.from("exam_set_items").insert({ set_id: draftSet, item_id: await fixture("published"), section: 1, position: 10 + ++counter }).select("item_id")) },
    { name: "Thêm câu vào đề đã ẩn / đã công bố", expected: "❌❌✅✅❌", note: "Biên tập viên chỉ ghép câu khi đề đang nháp / cần chỉnh sửa",
      run: async (c) => wrote(await c.from("exam_set_items").insert({ set_id: hiddenSet, item_id: await fixture("published"), section: 1, position: 10 + ++counter }).select("item_id")) },
    { name: "Tạo tư liệu nháp", expected: "❌✅✅✅❌",
      run: (c) => c.from("exam_passages").insert({ title: `${PREFIX} tư liệu ${++counter}`, body: "Đoạn tư liệu thử đủ ba mươi ký tự cho ràng buộc độ dài.", source_citation: "Kiểm thử RLS" }).select("id").then(wrote) },
  ];

  for (const op of OPS) {
    const actual = [];
    for (const role of ROLES) {
      try {
        actual.push(await op.run(clients[role]));
      } catch {
        actual.push("?");
      }
    }
    const match = actual.join("") === op.expected;
    if (!match) mismatches++;
    rows.push({ op, actual, match });
  }
} finally {
  await cleanup();
}

console.log("| Thao tác | " + ROLES.join(" | ") + " |");
console.log("|---|" + ROLES.map(() => ":-:").join("|") + "|");
for (const { op, actual, match } of rows) console.log(`| ${op.name}${match ? "" : " ⚠ LỆCH kỳ vọng " + op.expected} | ${actual.join(" | ")} |`);
console.log("");
for (const { op } of rows) if (op.note) console.log(`- **${op.name}**: ${op.note}`);
console.log("");
const { count } = await service.from("exam_items").select("id", { count: "exact", head: true }).like("stem", `${PREFIX}%`);
console.log(`Dữ liệu thử còn sót: ${count ?? "?"} câu (phải là 0).`);
console.log(`Tổng: ${rows.length - mismatches}/${rows.length} thao tác khớp kỳ vọng (${(rows.length - mismatches) * ROLES.length}/${rows.length * ROLES.length} ô).`);
process.exitCode = mismatches === 0 && count === 0 ? 0 : 1;
