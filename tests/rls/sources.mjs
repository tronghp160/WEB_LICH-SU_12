// Kịch bản kiểm thử RLS chạy trên database THẬT bằng các tài khoản thử (Phase 9–12).
// Cách chạy:  TEST_PW='<mật khẩu chung của tài khoản @test.local>' node tests/rls/<tên>.mjs
// Mật khẩu KHÔNG nằm trong repo. Mọi dữ liệu thử có tiền tố "zz-kiem-thu"/"ZZ KIỂM THỬ" và được dọn ở cuối.
import { as } from "./_client.mjs";
const editor = await as("editor@test.local");
const reviewer = await as("reviewer@test.local");
const admin = await as("admin@test.local");
const res = { cases: {}, links: {} };
const P = "ZZ KIỂM THỬ SRC ";

async function cleanup() {
  await admin.from("historical_events").delete().like("slug", "zz-kiem-thu-%");
  await admin.from("sources").delete().like("title", "ZZ KIỂM THỬ%");
}
await cleanup();

const outcome = (r) => (r.error ? `bị chặn (${r.error.code})` : r.data?.length ? `ĐƯỢC (${r.data.length} dòng)` : "0 dòng (bị chặn âm thầm)");

try {
  const topicId = (await admin.from("curriculum_topics").select("id").limit(1).single()).data.id;
  const mkEvent = async (slug) => {
    const ins = await editor.from("historical_events").insert({ topic_id: topicId, title: "ZZ " + slug, slug, start_year: 1954, date_text: "1954", date_precision: "year", summary: "s", workflow_status: "draft" }).select("id").single();
    if (ins.error) throw new Error("event " + slug + ": " + ins.error.message);
    return ins.data.id;
  };
  const mkSource = async (name, client = editor) => {
    const ins = await client.from("sources").insert({ title: P + name, source_type: "book", citation: "trích dẫn " + name }).select("id").single();
    if (ins.error) throw new Error("source " + name + ": " + ins.error.message);
    return ins.data.id;
  };

  // Editor được INSERT nguồn mới
  const s = { draft: await mkSource("draft"), pending: await mkSource("pending"), published: await mkSource("published"), hidden: await mkSource("hidden"), media: await mkSource("chỉ-ảnh"), free: await mkSource("chưa-gắn"), free2: await mkSource("chưa-gắn-2") };
  res.editorInsertSource = "được (đúng)";

  const ev = { draft: await mkEvent("zz-kiem-thu-e-draft"), pending: await mkEvent("zz-kiem-thu-e-pending"), published: await mkEvent("zz-kiem-thu-e-published"), hidden: await mkEvent("zz-kiem-thu-e-hidden"), media: await mkEvent("zz-kiem-thu-e-media") };
  // admin gắn nguồn (mỗi sự kiện cần ≥1 nguồn để chuyển trạng thái)
  for (const k of ["draft", "pending", "published", "hidden"]) {
    const l = await admin.from("event_sources").insert({ event_id: ev[k], source_id: s[k] });
    if (l.error) throw new Error("link " + k + ": " + l.error.message);
  }
  // sự kiện "media": cần 1 nguồn khác để publish; nguồn s.media chỉ gắn qua media_assets.source_id
  const filler = await mkSource("phụ");
  await admin.from("event_sources").insert({ event_id: ev.media, source_id: filler });
  const m = await admin.from("media_assets").insert({ event_id: ev.media, file_url: "https://example.com/x.jpg", media_type: "image", alt_text: "alt", source_id: s.media });
  if (m.error) throw new Error("media: " + m.error.message);

  // đặt trạng thái bằng admin
  await admin.from("historical_events").update({ workflow_status: "pending_review" }).eq("id", ev.pending);
  await admin.from("historical_events").update({ workflow_status: "published" }).eq("id", ev.published);
  await admin.from("historical_events").update({ workflow_status: "published" }).eq("id", ev.hidden);
  await admin.from("historical_events").update({ workflow_status: "hidden" }).eq("id", ev.hidden);
  await admin.from("historical_events").update({ workflow_status: "published" }).eq("id", ev.media);
  const st = await admin.from("historical_events").select("slug, workflow_status").like("slug", "zz-kiem-thu-e-%");
  res.eventStatuses = Object.fromEntries(st.data.map((r) => [r.slug.replace("zz-kiem-thu-e-", ""), r.workflow_status]));

  // ---- Editor UPDATE / DELETE ----
  const expect = { draft: "được", pending: "chặn", published: "chặn", hidden: "chặn", media: "chặn", free: "được" };
  for (const k of ["draft", "pending", "published", "hidden", "media", "free"]) {
    const u = await editor.from("sources").update({ citation: "editor sửa " + k }).eq("id", s[k]).select("id");
    res.cases["editor UPDATE nguồn " + k] = { kết_quả: outcome(u), kỳ_vọng_sau_migration: expect[k] };
  }
  // DELETE: nguồn chưa gắn (được) / gắn chỉ qua ảnh của sự kiện đã công bố (chặn) / gắn vào sự kiện đã công bố (chặn: policy hoặc khóa ngoại)
  const d1 = await editor.from("sources").delete().eq("id", s.free2).select("id");
  res.cases["editor DELETE nguồn chưa gắn"] = { kết_quả: outcome(d1), kỳ_vọng_sau_migration: "được" };
  const d2 = await editor.from("sources").delete().eq("id", s.media).select("id");
  res.cases["editor DELETE nguồn chỉ gắn qua ảnh của sự kiện đã công bố"] = { kết_quả: outcome(d2), kỳ_vọng_sau_migration: "chặn" };
  const d3 = await editor.from("sources").delete().eq("id", s.published).select("id");
  res.cases["editor DELETE nguồn của sự kiện đã công bố"] = { kết_quả: outcome(d3), kỳ_vọng_sau_migration: "chặn" };
  const mediaAfter = await admin.from("media_assets").select("source_id").eq("event_id", ev.media).single();
  res.mediaSourceStillSet = mediaAfter.data?.source_id === s.media ? "còn nguyên" : "ĐÃ BỊ XÓA/NULL (ảnh của sự kiện đã công bố mất nguồn)";

  // ---- Reviewer & admin giữ nguyên ----
  const r1 = await reviewer.from("sources").update({ citation: "reviewer sửa" }).eq("id", s.published).select("id");
  res.cases["reviewer UPDATE nguồn published"] = { kết_quả: outcome(r1), kỳ_vọng_sau_migration: "được (giữ nguyên)" };
  const a1 = await admin.from("sources").update({ citation: "admin sửa" }).eq("id", s.published).select("id");
  res.cases["admin UPDATE nguồn published"] = { kết_quả: outcome(a1), kỳ_vọng_sau_migration: "được (giữ nguyên)" };
  const a2 = await admin.from("sources").update({ citation: "admin sửa" }).eq("id", s.pending).select("id");
  res.cases["admin UPDATE nguồn pending"] = { kết_quả: outcome(a2), kỳ_vọng_sau_migration: "được (giữ nguyên)" };
  const r2 = await reviewer.from("sources").insert({ title: P + "reviewer", source_type: "book", citation: "x" }).select("id");
  res.cases["reviewer INSERT nguồn"] = { kết_quả: outcome(r2), kỳ_vọng_sau_migration: "được (giữ nguyên)" };

  // ---- Bảng liên kết: admin & reviewer vẫn ghi được trên sự kiện đã công bố ----
  const l1 = await admin.from("event_sources").update({ source_note: "admin ghi" }).eq("event_id", ev.published).select("event_id");
  res.links["admin UPDATE event_sources (sự kiện published)"] = outcome(l1);
  const l2 = await reviewer.from("event_sources").update({ source_note: "reviewer ghi" }).eq("event_id", ev.published).select("event_id");
  res.links["reviewer UPDATE event_sources (sự kiện published)"] = outcome(l2);
  const l3 = await editor.from("event_sources").update({ source_note: "editor ghi lén" }).eq("event_id", ev.published).select("event_id");
  res.links["editor UPDATE event_sources (sự kiện published)"] = outcome(l3);
  const l4 = await editor.from("event_sources").update({ source_note: "editor ghi" }).eq("event_id", ev.draft).select("event_id");
  res.links["editor UPDATE event_sources (sự kiện draft)"] = outcome(l4);
  // editor không "chuyển" liên kết của sự kiện draft sang sự kiện published bằng cách đổi event_id
  const l5 = await editor.from("event_sources").update({ event_id: ev.published }).eq("event_id", ev.draft).eq("source_id", s.draft).select("event_id");
  res.links["editor đổi event_id của liên kết sang sự kiện published"] = outcome(l5);
} catch (e) {
  res.FAILED = String(e).slice(0, 500);
} finally {
  await cleanup();
  res.left = { events: (await admin.from("historical_events").select("id").like("slug", "zz-kiem-thu-%")).data?.length, sources: (await admin.from("sources").select("id").like("title", "ZZ KIỂM THỬ%")).data?.length };
}
console.log(JSON.stringify(res, null, 1));
