// Kịch bản kiểm thử RLS của KIỂM DUYỆT VIÊN trên database thật (Phase 11).
// Cách chạy:  TEST_PW='<mật khẩu chung của tài khoản @test.local>' node tests/rls/reviewer.mjs
// Mật khẩu KHÔNG nằm trong repo. Dữ liệu thử có tiền tố "zz-kiem-thu" và được dọn ở cuối.
import { as } from "./_client.mjs";

const editor = await as("editor@test.local");
const reviewer = await as("reviewer@test.local");
const admin = await as("admin@test.local");
const res = { cases: {}, FAILED: undefined };

const outcome = (r) => (r.error ? `bị chặn (${r.error.code})` : r.data?.length ? `ĐƯỢC (${r.data.length} dòng)` : "0 dòng (bị chặn âm thầm)");
// `known`: mô tả lỗ hổng ĐÃ BIẾT (chưa có migration) — ca lệch kỳ vọng nhưng không tính là lỗi mới.
const record = (name, actual, expected, known) => {
  const pass = expected === "được" ? actual.startsWith("ĐƯỢC") : !actual.startsWith("ĐƯỢC");
  res.cases[name] = { kết_quả: actual, kỳ_vọng: expected, khớp: pass, ...(known && !pass ? { lỗ_hổng_đã_biết: known } : {}) };
};

async function cleanup() {
  await admin.from("historical_events").delete().like("slug", "zz-kiem-thu-%");
  await admin.from("historical_figures").delete().like("slug", "zz-kiem-thu-%");
  await admin.from("historical_locations").delete().like("slug", "zz-kiem-thu-%");
  await admin.from("curriculum_topics").delete().like("slug", "zz-kiem-thu-%");
  await admin.from("sources").delete().like("title", "ZZ KIỂM THỬ%");
}
await cleanup();

try {
  const topicId = (await admin.from("curriculum_topics").select("id").limit(1).single()).data.id;
  const src = (await editor.from("sources").insert({ title: "ZZ KIỂM THỬ nguồn reviewer", source_type: "book", citation: "x" }).select("id").single()).data.id;

  // Sự kiện cần ≥1 nguồn để rời trạng thái draft (trigger G4) → admin gắn nguồn.
  const mkEvent = async (slug) => {
    const ins = await editor.from("historical_events").insert({ topic_id: topicId, title: "ZZ " + slug, slug, start_year: 1954, date_text: "1954", date_precision: "year", summary: "s", workflow_status: "draft" }).select("id").single();
    if (ins.error) throw new Error(slug + ": " + ins.error.message);
    await admin.from("event_sources").insert({ event_id: ins.data.id, source_id: src });
    return ins.data.id;
  };
  const setStatus = async (id, status) => (await admin.from("historical_events").update({ workflow_status: status }).eq("id", id)).error;

  const ePending = await mkEvent("zz-kiem-thu-r-pending");
  await setStatus(ePending, "pending_review");
  const eDraft = await mkEvent("zz-kiem-thu-r-draft");
  const eRev = await mkEvent("zz-kiem-thu-r-needsrev");
  await setStatus(eRev, "needs_revision");
  const ePub = await mkEvent("zz-kiem-thu-r-pub");
  await setStatus(ePub, "published");

  // ---- Đọc ----
  const readAll = await reviewer.from("historical_events").select("slug").like("slug", "zz-kiem-thu-r-%");
  res.reviewerReadsAllStatuses = `${readAll.data?.length ?? 0}/4 sự kiện thử (mọi trạng thái)`;

  // ---- Chuyển trạng thái được phép ----
  record("pending_review → needs_revision (kèm review_note)", outcome(await reviewer.from("historical_events").update({ workflow_status: "needs_revision", review_note: "Sai mốc thời gian" }).eq("id", ePending).eq("workflow_status", "pending_review").select("id")), "được");
  const note = await admin.from("historical_events").select("review_note, workflow_status").eq("id", ePending).single();
  res.reviewNoteSaved = `${note.data.workflow_status} / "${note.data.review_note}"`;

  await setStatus(ePending, "pending_review");
  record("pending_review → published (xóa review_note)", outcome(await reviewer.from("historical_events").update({ workflow_status: "published", review_note: null }).eq("id", ePending).eq("workflow_status", "pending_review").select("id")), "được");
  record("published → hidden", outcome(await reviewer.from("historical_events").update({ workflow_status: "hidden" }).eq("id", ePending).eq("workflow_status", "published").select("id")), "được");
  record("hidden → published (công bố lại)", outcome(await reviewer.from("historical_events").update({ workflow_status: "published" }).eq("id", ePending).eq("workflow_status", "hidden").select("id")), "được");

  // ---- Chuyển trạng thái KHÔNG được phép ----
  record("draft → published", outcome(await reviewer.from("historical_events").update({ workflow_status: "published" }).eq("id", eDraft).select("id")), "chặn");
  record("needs_revision → published", outcome(await reviewer.from("historical_events").update({ workflow_status: "published" }).eq("id", eRev).select("id")), "chặn");
  record("published → draft", outcome(await reviewer.from("historical_events").update({ workflow_status: "draft" }).eq("id", ePub).select("id")), "chặn");
  record("published → pending_review", outcome(await reviewer.from("historical_events").update({ workflow_status: "pending_review" }).eq("id", ePub).select("id")), "chặn");

  // ---- Không tạo/sửa/xóa nội dung ----
  record("reviewer tạo sự kiện mới (draft)", outcome(await reviewer.from("historical_events").insert({ topic_id: topicId, title: "ZZ rev", slug: "zz-kiem-thu-r-new", start_year: 1954, date_text: "1954", date_precision: "year", summary: "s", workflow_status: "draft" }).select("id")), "chặn");
  record("reviewer tạo nhân vật mới", outcome(await reviewer.from("historical_figures").insert({ name: "ZZ rev", slug: "zz-kiem-thu-r-fig", workflow_status: "draft" }).select("id")), "chặn");
  record("reviewer tạo chủ đề mới", outcome(await reviewer.from("curriculum_topics").insert({ name: "ZZ rev", slug: "zz-kiem-thu-r-topic", workflow_status: "draft" }).select("id")), "chặn");
  record("reviewer sửa nội dung (summary) của bản đã công bố", outcome(await reviewer.from("historical_events").update({ summary: "reviewer sửa nội dung" }).eq("id", ePub).select("id")), "chặn", "G5 (đã bỏ qua ở Phase 1): policy reviewer_update_status chỉ kiểm tra trạng thái mới nên published → published (đổi nội dung) vẫn hợp lệ");
  record("reviewer xóa sự kiện", outcome(await reviewer.from("historical_events").delete().eq("id", ePub).select("id")), "chặn");

  // ---- Địa điểm CÓ tọa độ: cột `geom` sinh tự động không được làm trigger G5 chặn nhầm (lỗi đã gặp) ----
  const mkLocation = async (slug, coords) => {
    const r = await editor.from("historical_locations").insert({ name: "ZZ " + slug, slug, accuracy_level: "exact", ...(coords ? { latitude: 21.03, longitude: 105.85 } : {}), workflow_status: "draft" }).select("id").single();
    await editor.from("historical_locations").update({ workflow_status: "pending_review" }).eq("id", r.data.id);
    return r.data.id;
  };
  const locCoords = await mkLocation("zz-kiem-thu-r-dd-toa-do", true);
  const locNoCoords = await mkLocation("zz-kiem-thu-r-dd-khong-toa-do", false);
  record("reviewer công bố địa điểm CÓ tọa độ", outcome(await reviewer.from("historical_locations").update({ workflow_status: "published", review_note: null }).eq("id", locCoords).select("id")), "được");
  record("reviewer công bố địa điểm KHÔNG có tọa độ", outcome(await reviewer.from("historical_locations").update({ workflow_status: "published", review_note: null }).eq("id", locNoCoords).select("id")), "được");
  record("reviewer ẩn địa điểm có tọa độ", outcome(await reviewer.from("historical_locations").update({ workflow_status: "hidden" }).eq("id", locCoords).select("id")), "được");
  record("reviewer đổi tọa độ địa điểm", outcome(await reviewer.from("historical_locations").update({ latitude: 10.5, longitude: 106.5 }).eq("id", locNoCoords).select("id")), "chặn");
  record("reviewer đổi tên địa điểm", outcome(await reviewer.from("historical_locations").update({ name: "ZZ reviewer đổi tên" }).eq("id", locNoCoords).select("id")), "chặn");
  // nhân vật và chủ đề: cùng trigger
  const mkSimple = async (table, row) => {
    const r = await editor.from(table).insert({ ...row, workflow_status: "draft" }).select("id").single();
    await editor.from(table).update({ workflow_status: "pending_review" }).eq("id", r.data.id);
    return r.data.id;
  };
  const figId = await mkSimple("historical_figures", { name: "ZZ nv", slug: "zz-kiem-thu-r-nv", biography: "Tiểu sử" });
  const topId = await mkSimple("curriculum_topics", { name: "ZZ chủ đề", slug: "zz-kiem-thu-r-chu-de", description: "Mô tả" });
  record("reviewer sửa tiểu sử nhân vật", outcome(await reviewer.from("historical_figures").update({ biography: "reviewer sửa" }).eq("id", figId).select("id")), "chặn");
  record("reviewer công bố nhân vật", outcome(await reviewer.from("historical_figures").update({ workflow_status: "published", review_note: null }).eq("id", figId).select("id")), "được");
  record("reviewer sửa mô tả chủ đề", outcome(await reviewer.from("curriculum_topics").update({ description: "reviewer sửa" }).eq("id", topId).select("id")), "chặn");
  record("reviewer công bố chủ đề", outcome(await reviewer.from("curriculum_topics").update({ workflow_status: "published", review_note: null }).eq("id", topId).select("id")), "được");

  // ---- Editor không tự duyệt ----
  await setStatus(ePending, "pending_review");
  record("editor: pending_review → published", outcome(await editor.from("historical_events").update({ workflow_status: "published" }).eq("id", ePending).select("id")), "chặn");
  record("editor: pending_review → needs_revision", outcome(await editor.from("historical_events").update({ workflow_status: "needs_revision" }).eq("id", ePending).select("id")), "chặn");
} catch (e) {
  res.FAILED = String(e).slice(0, 500);
} finally {
  await cleanup();
  res.left = (await admin.from("historical_events").select("id").like("slug", "zz-kiem-thu-%")).data?.length;
}

const mismatched = Object.entries(res.cases).filter(([, v]) => !v.khớp);
const failed = mismatched.filter(([, v]) => !v.lỗ_hổng_đã_biết).map(([k]) => k);
const known = mismatched.filter(([, v]) => v.lỗ_hổng_đã_biết).map(([k]) => k);
res.tổng = `${Object.keys(res.cases).length - mismatched.length}/${Object.keys(res.cases).length} ca khớp kỳ vọng`;
if (known.length) res.LỖ_HỔNG_ĐÃ_BIẾT = known;
if (failed.length) res.KHÔNG_KHỚP = failed;
console.log(JSON.stringify(res, null, 1));
