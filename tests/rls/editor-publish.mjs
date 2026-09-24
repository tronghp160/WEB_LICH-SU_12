// Kịch bản kiểm thử RLS chạy trên database THẬT bằng các tài khoản thử (Phase 9–12).
// Cách chạy:  TEST_PW='<mật khẩu chung của tài khoản @test.local>' node tests/rls/<tên>.mjs
// Mật khẩu KHÔNG nằm trong repo. Mọi dữ liệu thử có tiền tố "zz-kiem-thu"/"ZZ KIỂM THỬ" và được dọn ở cuối.
import { as } from "./_client.mjs";
const editor = await as("editor@test.local");
const reviewer = await as("reviewer@test.local");
const admin = await as("admin@test.local");
const res = {};
let eventId;
try {
  const topicId = (await admin.from("curriculum_topics").select("id").limit(1).single()).data.id;
  const ins = await editor.from("historical_events").insert({ topic_id: topicId, title: "ZZ publish rls", slug: "zz-kiem-thu-publish", start_year: 1954, date_text: "1954", date_precision: "year", summary: "s", workflow_status: "draft" }).select("id").single();
  eventId = ins.data.id;
  const src = (await admin.from("sources").select("id").limit(1).single()).data.id;
  // đủ 1 nguồn (admin gắn) → trigger G4 không còn chặn, chỉ còn RLS quyết định
  const link = await admin.from("event_sources").insert({ event_id: eventId, source_id: src });
  res.adminLinkSource = link.error?.message ?? "ok";

  const pub = await editor.from("historical_events").update({ workflow_status: "published" }).eq("id", eventId).select("id");
  res.editorPublishesDraftWithSource = pub.error ? `bị chặn: ${pub.error.code} (${pub.error.message.slice(0, 70)})` : `ĐƯỢC?! ${pub.data.length}`;
  const hid = await editor.from("historical_events").update({ workflow_status: "hidden" }).eq("id", eventId).select("id");
  res.editorHidesDraft = hid.error ? `bị chặn: ${hid.error.code}` : `ĐƯỢC?! ${hid.data.length}`;
  const insPub = await editor.from("historical_events").insert({ topic_id: topicId, title: "ZZ pub", slug: "zz-kiem-thu-publish-2", start_year: 1954, date_text: "1954", date_precision: "year", summary: "s", workflow_status: "published" }).select("id");
  res.editorInsertsPublished = insPub.error ? `bị chặn: ${insPub.error.code}` : `ĐƯỢC?! ${insPub.data.length}`;
  const submit = await editor.from("historical_events").update({ workflow_status: "pending_review" }).eq("id", eventId).select("id");
  res.editorSubmitsForReview = submit.error ? `lỗi: ${submit.error.message}` : `được (${submit.data.length} dòng) — đúng`;

  // Reviewer không tạo mới được nội dung
  const rIns = await reviewer.from("historical_events").insert({ topic_id: topicId, title: "ZZ rev", slug: "zz-kiem-thu-rev", start_year: 1954, date_text: "1954", date_precision: "year", summary: "s", workflow_status: "draft" }).select("id");
  res.reviewerInsertsDraft = rIns.error ? `bị chặn: ${rIns.error.code}` : `ĐƯỢC?! ${rIns.data.length}`;
  // Reviewer không sửa được nội dung (chỉ đổi trạng thái)
  const rEdit = await reviewer.from("historical_events").update({ summary: "reviewer sửa nội dung" }).eq("id", eventId).select("id");
  res.reviewerEditsPendingContent = rEdit.error ? `bị chặn: ${rEdit.error.code}` : `${rEdit.data.length} dòng bị sửa (chính sách hiện cho phép — G5 đã bỏ qua)`;
} finally {
  if (eventId) await admin.from("historical_events").delete().eq("id", eventId);
  await admin.from("historical_events").delete().like("slug", "zz-kiem-thu-%");
  res.left = (await admin.from("historical_events").select("id").like("slug", "zz-kiem-thu-%")).data.length;
}
console.log(JSON.stringify(res, null, 1));
