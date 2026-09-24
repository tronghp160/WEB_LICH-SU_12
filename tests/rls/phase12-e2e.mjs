// Nghiệm thu Phase 12 (Quản trị viên: UC13 nhân sự, UC14 quản trị nội dung, UC15 vận hành) trên database thật.
// Cần: server chạy ở http://localhost:3100 (npm run build && npx next start -p 3100) và Microsoft Edge.
// Cách chạy:  TEST_PW='<mật khẩu chung tài khoản @test.local>' node tests/rls/phase12-e2e.mjs
// Dữ liệu thử có tiền tố "zz-kiem-thu-p12"/"ZZ KIỂM THỬ P12" và được dọn ở cuối; trạng thái nhân sự được khôi phục.
import { chromium } from "@playwright/test";
import { as } from "./_client.mjs";

const base = "http://localhost:3100";
const out = new URL("../../docs/screenshots", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PW = process.env.TEST_PW;
const res = { steps: {} };
const ok = (name, value) => { res.steps[name] = value; };

const admin = await as("admin@test.local");
const editorApi = await as("editor@test.local");
const reviewerApi = await as("reviewer@test.local");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const staffBefore = (await admin.from("staff_profiles").select("id, full_name, role, account_status")).data;

async function cleanup() {
  const { data: events } = await admin.from("historical_events").select("id").like("slug", "zz-kiem-thu-p12-%");
  for (const e of events ?? []) {
    const { data: files } = await admin.storage.from("media").list(`events/${e.id}`);
    if (files?.length) await admin.storage.from("media").remove(files.map((f) => `events/${e.id}/${f.name}`));
  }
  await admin.from("historical_events").delete().like("slug", "zz-kiem-thu-p12-%");
  await admin.from("historical_figures").delete().like("slug", "zz-kiem-thu-p12-%");
  await admin.from("historical_locations").delete().like("slug", "zz-kiem-thu-p12-%");
  await admin.from("curriculum_topics").delete().like("slug", "zz-kiem-thu-p12-%");
  await admin.from("sources").delete().like("title", "ZZ KIỂM THỬ P12%");
}
async function restoreStaff() {
  for (const row of staffBefore) {
    await admin.from("staff_profiles").update({ role: row.role, account_status: row.account_status }).eq("id", row.id);
  }
}
await cleanup();

const browser = await chromium.launch({ channel: "msedge" });
const dialogs = [];
async function newSession(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => { dialogs.push(d.message()); d.accept(); });
  page.on("pageerror", (e) => (res.pageErrors ??= []).push(String(e)));
  await page.goto(base + "/quan-tri/dang-nhap");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PW);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(base + "/quan-tri");
  return { ctx, page };
}
const flat = (t) => t.replace(/\s+/g, " ").trim();
const text = async (page, sel) => flat(await page.locator(sel).first().innerText());
const buttons = async (page, names) => Object.fromEntries(await Promise.all(names.map(async (n) => [n, await page.getByRole("button", { name: n, exact: true }).count()])));
const statusOf = async (table, id) => (await admin.from(table).select("workflow_status").eq("id", id).maybeSingle()).data?.workflow_status ?? null;

try {
  const topicId = (await admin.from("curriculum_topics").select("id").limit(1).single()).data.id;
  const src = (await admin.from("sources").insert({ title: "ZZ KIỂM THỬ P12 nguồn", source_type: "book", citation: "SGK thử P12" }).select("id").single()).data.id;

  const adm = await newSession("admin@test.local");
  const ap = adm.page;

  // ======================= UC15: VẬN HÀNH =======================
  await ap.goto(base + "/quan-tri/van-hanh");
  ok("UC15_baseline", {
    h1: await text(ap, "h1"),
    overall: await text(ap, "[role=status]"),
    db: await text(ap, "#ket-noi-db + *"),
    counts_header: flat(await ap.locator("#thong-ke ~ div thead").innerText()),
    counts_rows: (await ap.locator("#thong-ke ~ div tbody tr").allInnerTexts()).map(flat),
    integrity_badges: (await ap.locator("#toan-ven ~ section").allInnerTexts()).map((t) => flat(t).slice(0, 110)),
  });
  await ap.screenshot({ path: `${out}/phase12-van-hanh-ban-dau.png`, fullPage: true });

  // Dữ liệu cố ý sai: sự kiện đã công bố nhưng bị gỡ nguồn; địa điểm công bố thiếu tọa độ; ảnh thiếu alt; sự kiện thuộc chủ đề nháp.
  const mkEvent = async (slug, title, topic = topicId) => {
    const ins = await admin.from("historical_events").insert({ topic_id: topic, title, slug, start_year: 1954, date_text: "1954", date_precision: "year", summary: "s", workflow_status: "draft" }).select("id").single();
    if (ins.error) throw new Error(slug + ": " + ins.error.message);
    await admin.from("event_sources").insert({ event_id: ins.data.id, source_id: src });
    return ins.data.id;
  };
  const E_bad = await mkEvent("zz-kiem-thu-p12-thieu-nguon", "ZZ Kiểm thử P12 Thiếu nguồn");
  await admin.from("historical_events").update({ workflow_status: "published" }).eq("id", E_bad);
  await admin.from("event_sources").delete().eq("event_id", E_bad); // cố ý làm sai: đã công bố nhưng 0 nguồn
  await admin.from("media_assets").insert({ event_id: E_bad, file_url: "https://example.com/x.jpg", media_type: "image", alt_text: null });
  await admin.from("historical_locations").insert({ name: "ZZ KIỂM THỬ P12 Địa điểm thiếu tọa độ", slug: "zz-kiem-thu-p12-dd-thieu-toa-do", accuracy_level: "unknown", workflow_status: "published" });
  const T_draft = (await admin.from("curriculum_topics").insert({ name: "ZZ Kiểm thử P12 Chủ đề nháp", slug: "zz-kiem-thu-p12-chu-de-nhap", workflow_status: "draft" }).select("id").single()).data.id;
  const E_topic = await mkEvent("zz-kiem-thu-p12-chu-de-nhap-sk", "ZZ Kiểm thử P12 Sự kiện trong chủ đề nháp", T_draft);
  await admin.from("historical_events").update({ workflow_status: "published" }).eq("id", E_topic);

  await ap.goto(base + "/quan-tri/van-hanh");
  ok("UC15_after_bad_data", {
    overall: await text(ap, "[role=status]"),
    sections: (await ap.locator("#toan-ven ~ section").allInnerTexts()).map((t) => flat(t).slice(0, 230)),
  });
  const links = await ap.locator("#toan-ven ~ section a").evaluateAll((as) => as.map((a) => ({ t: a.textContent.trim(), h: a.getAttribute("href") })));
  ok("UC15_detects_missing_source_event", links.some((l) => l.t === "ZZ Kiểm thử P12 Thiếu nguồn" && l.h.endsWith(E_bad)));
  ok("UC15_detects_location_no_coords", links.some((l) => l.t.includes("Địa điểm thiếu tọa độ")));
  ok("UC15_detects_media_no_alt", links.some((l) => l.t === "ZZ Kiểm thử P12 Thiếu nguồn" && l.h.endsWith(E_bad)));
  ok("UC15_detects_topic_unpublished", links.some((l) => l.t.includes("Sự kiện trong chủ đề nháp")));
  await ap.screenshot({ path: `${out}/phase12-van-hanh-phat-hien-loi.png`, fullPage: true });
  // Bấm liên kết tới trang sửa từ báo cáo
  await ap.locator(`#toan-ven ~ section a[href$="${E_bad}"]`).first().click();
  await ap.waitForURL(new RegExp(E_bad));
  ok("UC15_link_opens_edit_page", ap.url().replace(base, "").replace(E_bad, "<id>"));

  // ======================= UC13: NHÂN SỰ =======================
  await ap.goto(base + "/quan-tri/nhan-su");
  const rows = ap.locator("main ul > li");
  ok("UC13_list", { count: await rows.count(), names: (await rows.allInnerTexts()).map((t) => flat(t).slice(0, 60)) });
  ok("UC13_warning_no_secret_key", await text(ap, "[role=note]"));
  ok("UC13_create_form_disabled", { fieldsetDisabled: await ap.locator("form fieldset[disabled]").count(), submitDisabled: await ap.getByRole("button", { name: "Tạo tài khoản" }).isDisabled() });
  const selfRow = rows.filter({ hasText: "Quản trị viên thử" });
  ok("UC13_self_row_protected", {
    hasSelfBadge: (await selfRow.innerText()).includes("Bạn"),
    roleSelectDisabled: await selfRow.locator("select").isDisabled(),
    lockButtonDisabled: await selfRow.getByRole("button", { name: "Khóa tài khoản" }).isDisabled(),
    explanation: flat(await selfRow.locator("p.text-xs").innerText()),
  });
  await ap.screenshot({ path: `${out}/phase12-nhan-su.png`, fullPage: true });

  // Đổi vai trò (dùng tài khoản đã khóa để không ảnh hưởng người khác), rồi trả lại.
  const lockedRow = rows.filter({ hasText: "Biên tập viên bị khóa" });
  await lockedRow.locator("select").selectOption("reviewer");
  await lockedRow.getByRole("button", { name: "Lưu vai trò" }).click();
  await lockedRow.getByText("Đã đổi vai trò").waitFor();
  const lockedId = staffBefore.find((r) => r.full_name === "Biên tập viên bị khóa").id;
  ok("UC13_change_role", { message: flat(await lockedRow.locator("[role=status]").innerText()), db: (await admin.from("staff_profiles").select("role").eq("id", lockedId).single()).data.role });
  await lockedRow.locator("select").selectOption("editor");
  await lockedRow.getByRole("button", { name: "Lưu vai trò" }).click();
  await lockedRow.getByText("Đã đổi vai trò").waitFor();

  // Khóa tài khoản giữa phiên → người đó mất quyền ở lần thao tác kế tiếp
  const ed = await newSession("editor@test.local");
  await ed.page.goto(base + "/quan-tri/noi-dung");
  ok("UC13_editor_before_lock", ed.page.url().replace(base, ""));
  await ap.goto(base + "/quan-tri/nhan-su");
  const editorRow = ap.locator("main ul > li").filter({ hasText: "Biên tập viên thử" });
  dialogs.length = 0;
  await editorRow.getByRole("button", { name: "Khóa tài khoản" }).click();
  await editorRow.getByText("Đã khóa tài khoản.").waitFor();
  ok("UC13_lock_confirm_dialog", dialogs.map(flat));
  const editorId = staffBefore.find((r) => r.full_name === "Biên tập viên thử").id;
  ok("UC13_db_locked", (await admin.from("staff_profiles").select("account_status").eq("id", editorId).single()).data.account_status);
  await ed.page.goto(base + "/quan-tri/noi-dung");
  ok("UC13_editor_after_lock", { url: ed.page.url().replace(base, ""), h1: await text(ed.page, "h1") });
  await editorRow.getByRole("button", { name: "Mở khóa" }).click();
  await editorRow.getByText("Đã mở khóa tài khoản.").waitFor();
  await ed.page.goto(base + "/quan-tri/noi-dung");
  ok("UC13_editor_after_unlock", ed.page.url().replace(base, ""));
  await ed.ctx.close();

  // Ràng buộc "admin cuối cùng" ở DATABASE (gọi thẳng API, bỏ qua giao diện)
  const adminId = staffBefore.find((r) => r.full_name === "Quản trị viên thử").id;
  const selfLock = await admin.from("staff_profiles").update({ account_status: "locked" }).eq("id", adminId).select("id");
  ok("UC13_api_last_admin_lock_blocked", selfLock.error ? `${selfLock.error.code}: ${selfLock.error.message}` : `ĐƯỢC?! ${selfLock.data.length}`);
  const selfDemote = await admin.from("staff_profiles").update({ role: "editor" }).eq("id", adminId).select("id");
  ok("UC13_api_last_admin_demote_blocked", selfDemote.error ? `${selfDemote.error.code}: ${selfDemote.error.message}` : `ĐƯỢC?! ${selfDemote.data.length}`);
  ok("UC13_admin_still_admin", (await admin.from("staff_profiles").select("role, account_status").eq("id", adminId).single()).data);
  // Người không phải admin không quản lý được nhân sự
  const e1 = await editorApi.from("staff_profiles").update({ role: "system_admin" }).eq("id", editorId).select("id");
  const r1 = await reviewerApi.from("staff_profiles").update({ account_status: "locked" }).eq("id", editorId).select("id");
  const e2 = await editorApi.from("staff_profiles").insert({ id: crypto.randomUUID(), full_name: "x", role: "editor" }).select("id");
  ok("UC13_non_admin_blocked", { editorPromote: e1.error ? e1.error.code : `${e1.data.length} dòng`, reviewerLock: r1.error ? r1.error.code : `${r1.data.length} dòng`, editorInsertProfile: e2.error ? e2.error.code : "ĐƯỢC?!" });

  // ======================= UC14: QUẢN TRỊ NỘI DUNG =======================
  const F14 = (await admin.from("historical_figures").insert({ name: "ZZ Kiểm thử P12 Nhân vật", slug: "zz-kiem-thu-p12-nv", workflow_status: "published" }).select("id").single()).data.id;
  const T14 = (await admin.from("curriculum_topics").insert({ name: "ZZ Kiểm thử P12 Chủ đề", slug: "zz-kiem-thu-p12-chu-de", workflow_status: "published" }).select("id").single()).data.id;
  const E14 = await mkEvent("zz-kiem-thu-p12-su-kien", "ZZ Kiểm thử P12 Sự kiện", T14);
  await admin.from("event_figures").insert({ event_id: E14, figure_id: F14 });
  await admin.from("historical_events").update({ workflow_status: "published" }).eq("id", E14);
  const up = await admin.storage.from("media").upload(`events/${E14}/thu.png`, PNG, { contentType: "image/png" });
  await admin.from("media_assets").insert({ event_id: E14, file_url: admin.storage.from("media").getPublicUrl(`events/${E14}/thu.png`).data.publicUrl, media_type: "image", alt_text: "alt" });
  ok("UC14_setup_storage_file", up.error ? up.error.message : "đã tải lên");

  const panel = ap.locator("section[aria-labelledby=quan-tri-noi-dung]");
  await ap.goto(`${base}/quan-tri/noi-dung/su-kien/${E14}`);
  ok("UC14_panel_for_published", await buttons(ap, ["Khôi phục về bản nháp", "Ẩn khỏi trang công khai", "Xóa vĩnh viễn"]));
  await ap.screenshot({ path: `${out}/phase12-quan-tri-noi-dung.png`, fullPage: true });
  ok("UC14_public_before", (await fetch(base + "/su-kien/zz-kiem-thu-p12-su-kien")).status);
  await panel.getByRole("button", { name: "Ẩn khỏi trang công khai" }).click();
  await ap.locator("section[aria-labelledby=quan-tri-noi-dung] [role=status]").getByText("Đã ẩn nội dung").waitFor();
  ok("UC14_hide", { db: await statusOf("historical_events", E14), publicStatus: (await fetch(base + "/su-kien/zz-kiem-thu-p12-su-kien")).status });
  await ap.reload();
  ok("UC14_panel_for_hidden", await buttons(ap, ["Khôi phục về bản nháp", "Ẩn khỏi trang công khai", "Xóa vĩnh viễn"]));
  await panel.getByRole("button", { name: "Khôi phục về bản nháp" }).click();
  await ap.locator("section[aria-labelledby=quan-tri-noi-dung] [role=status]").getByText("Đã khôi phục về bản nháp").waitFor();
  ok("UC14_restore_to_draft", await statusOf("historical_events", E14));
  await ap.reload();
  ok("UC14_panel_for_draft", await buttons(ap, ["Khôi phục về bản nháp", "Ẩn khỏi trang công khai", "Xóa vĩnh viễn"]));

  // Xóa cứng bị khóa ngoại chặn: nhân vật đang gắn sự kiện; chủ đề đang có sự kiện
  await ap.goto(`${base}/quan-tri/noi-dung/nhan-vat/${F14}`);
  dialogs.length = 0;
  await ap.locator("section[aria-labelledby=quan-tri-noi-dung]").getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await ap.locator("section[aria-labelledby=quan-tri-noi-dung] [role=alert]").waitFor();
  ok("UC14_delete_figure_blocked", { message: await text(ap, "section[aria-labelledby=quan-tri-noi-dung] [role=alert]"), stillExists: (await statusOf("historical_figures", F14)) !== null, dialog: dialogs.map(flat) });
  await ap.goto(`${base}/quan-tri/noi-dung/chu-de/${T14}`);
  await ap.locator("section[aria-labelledby=quan-tri-noi-dung]").getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await ap.locator("section[aria-labelledby=quan-tri-noi-dung] [role=alert]").waitFor();
  ok("UC14_delete_topic_blocked", { message: await text(ap, "section[aria-labelledby=quan-tri-noi-dung] [role=alert]"), stillExists: (await statusOf("curriculum_topics", T14)) !== null });
  await ap.screenshot({ path: `${out}/phase12-xoa-bi-chan.png`, fullPage: true });

  // Editor không thấy khung quản trị
  const ed2 = await newSession("editor@test.local");
  await ed2.page.goto(`${base}/quan-tri/noi-dung/su-kien/${E14}`);
  ok("UC14_editor_has_no_admin_panel", await ed2.page.locator("section[aria-labelledby=quan-tri-noi-dung]").count());
  await ed2.ctx.close();

  // Xóa sự kiện: liên kết + ảnh trong DB cascade, tệp Storage được dọn
  await ap.goto(`${base}/quan-tri/noi-dung/su-kien/${E14}`);
  dialogs.length = 0;
  await ap.locator("section[aria-labelledby=quan-tri-noi-dung]").getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await ap.waitForURL(/thong-bao=da-xoa/);
  const files = await admin.storage.from("media").list(`events/${E14}`);
  ok("UC14_delete_event", {
    redirectedTo: ap.url().replace(base, ""),
    notice: await text(ap, "[role=status]"),
    eventGone: (await statusOf("historical_events", E14)) === null,
    linksGone: (await admin.from("event_figures").select("event_id").eq("event_id", E14)).data.length === 0,
    mediaRowsGone: (await admin.from("media_assets").select("id").eq("event_id", E14)).data.length === 0,
    storageFilesLeft: files.data?.length ?? 0,
    dialog: dialogs.map(flat),
  });
  // Sau khi xóa sự kiện, xóa được nhân vật và chủ đề (không còn bị khóa ngoại chặn)
  await ap.goto(`${base}/quan-tri/noi-dung/nhan-vat/${F14}`);
  await ap.locator("section[aria-labelledby=quan-tri-noi-dung]").getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await ap.waitForURL(/thong-bao=da-xoa/);
  ok("UC14_delete_figure_after_unlinked", (await statusOf("historical_figures", F14)) === null);

  ok("secret_key_note", "SUPABASE_SECRET_KEY chưa cấu hình → luồng tạo tài khoản (createStaffAction) chưa thử được");
  await adm.ctx.close();
} catch (e) {
  res.FAILED = String(e).slice(0, 900);
} finally {
  await restoreStaff();
  await cleanup();
  res.staffRestored = JSON.stringify((await admin.from("staff_profiles").select("full_name, role, account_status")).data.map((r) => `${r.role}/${r.account_status}`).sort()) === JSON.stringify(staffBefore.map((r) => `${r.role}/${r.account_status}`).sort());
  res.cleanupLeft = {
    events: (await admin.from("historical_events").select("id").like("slug", "zz-kiem-thu-p12-%")).data?.length,
    figures: (await admin.from("historical_figures").select("id").like("slug", "zz-kiem-thu-p12-%")).data?.length,
    locations: (await admin.from("historical_locations").select("id").like("slug", "zz-kiem-thu-p12-%")).data?.length,
    topics: (await admin.from("curriculum_topics").select("id").like("slug", "zz-kiem-thu-p12-%")).data?.length,
    sources: (await admin.from("sources").select("id").like("title", "ZZ KIỂM THỬ P12%")).data?.length,
  };
  await browser.close();
}
console.log(JSON.stringify(res, null, 1));
