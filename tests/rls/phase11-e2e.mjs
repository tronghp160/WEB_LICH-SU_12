// Nghiệm thu Phase 11 (kiểm duyệt) end-to-end bằng trình duyệt + API trên database thật.
// Cần: server chạy ở http://localhost:3100 (npm run build && npx next start -p 3100) và Microsoft Edge.
// Cách chạy:  TEST_PW='<mật khẩu chung tài khoản @test.local>' node tests/rls/phase11-e2e.mjs
// Dữ liệu thử có tiền tố "zz-kiem-thu-p11" và được dọn ở cuối.
import { chromium } from "@playwright/test";
import { as } from "./_client.mjs";
const base = "http://localhost:3100";
const out = new URL("../../docs/screenshots", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PW = process.env.TEST_PW;
const res = { steps: {} };
const ok = (name, value) => { res.steps[name] = value; };

const admin = await as("admin@test.local");
const editorApi = await as("editor@test.local");

async function cleanup() {
  await admin.from("historical_events").delete().like("slug", "zz-kiem-thu-p11-%");
  await admin.from("historical_figures").delete().like("slug", "zz-kiem-thu-p11-%");
  await admin.from("historical_locations").delete().like("slug", "zz-kiem-thu-p11-%");
  await admin.from("curriculum_topics").delete().like("slug", "zz-kiem-thu-p11-%");
  await admin.from("sources").delete().like("title", "ZZ KIỂM THỬ P11%");
}
await cleanup();

const countPending = async () => {
  const t = ["curriculum_topics", "historical_events", "historical_figures", "historical_locations"];
  let n = 0;
  for (const table of t) n += (await admin.from(table).select("id", { count: "exact", head: true }).eq("workflow_status", "pending_review")).count ?? 0;
  return n;
};
const statusOf = async (table, id) => (await admin.from(table).select("workflow_status, review_note").eq("id", id).single()).data;

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
const text = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, " ").trim();
const badge = async (page) => (await page.locator('nav[aria-label="Menu khu vực nội bộ"] a[href="/quan-tri/kiem-duyet"]').innerText()).replace(/\s+/g, " ");
const buttons = async (page, names) => Object.fromEntries(await Promise.all(names.map(async (n) => [n, await page.getByRole("button", { name: n, exact: true }).count()])));

try {
  const baseline = await countPending();
  res.baselinePending = baseline;

  // ---------- Dữ liệu thử (chuẩn bị bằng API: editor tạo, admin gắn nguồn, editor gửi duyệt) ----------
  const topicId = (await admin.from("curriculum_topics").select("id").limit(1).single()).data.id;
  const src = (await editorApi.from("sources").insert({ title: "ZZ KIỂM THỬ P11 nguồn", source_type: "book", citation: "SGK dữ liệu thử P11" }).select("id").single()).data.id;
  const F1 = (await editorApi.from("historical_figures").insert({ name: "ZZ Nhân vật NHÁP P11", slug: "zz-kiem-thu-p11-nv-nhap", workflow_status: "draft" }).select("id").single()).data.id;
  const L1 = (await editorApi.from("historical_locations").insert({ name: "ZZ Địa điểm NHÁP P11", slug: "zz-kiem-thu-p11-dd-nhap", accuracy_level: "exact", latitude: 21.03, longitude: 105.85, workflow_status: "draft" }).select("id").single()).data.id;
  const mkEvent = async (slug, title) => {
    const ins = await editorApi.from("historical_events").insert({ topic_id: topicId, title, slug, start_year: 1954, date_text: "1954", date_precision: "year", summary: "Tóm tắt thử " + slug, content: "Nội dung thử", workflow_status: "draft" }).select("id").single();
    if (ins.error) throw new Error(slug + ": " + ins.error.message);
    await admin.from("event_sources").insert({ event_id: ins.data.id, source_id: src, source_note: "Trang 1", confidence_note: "Độ tin cậy cao" });
    return ins.data.id;
  };
  const E1 = await mkEvent("zz-kiem-thu-p11-su-kien-1", "ZZ Kiểm thử P11 Sự kiện 1");
  const E2 = await mkEvent("zz-kiem-thu-p11-su-kien-2", "ZZ Kiểm thử P11 Sự kiện 2");
  await admin.from("event_figures").insert({ event_id: E1, figure_id: F1, relationship: "Nhân vật nháp" });
  await admin.from("event_locations").insert({ event_id: E1, location_id: L1, location_role: "Nơi diễn ra", is_primary: true });
  const F2 = (await editorApi.from("historical_figures").insert({ name: "ZZ Kiểm thử P11 Nhân vật", slug: "zz-kiem-thu-p11-nv", biography: "Tiểu sử thử", workflow_status: "draft" }).select("id").single()).data.id;
  const L2 = (await editorApi.from("historical_locations").insert({ name: "ZZ Kiểm thử P11 Địa điểm", slug: "zz-kiem-thu-p11-dd", accuracy_level: "approximate", latitude: 16.46, longitude: 107.59, workflow_status: "draft" }).select("id").single()).data.id;
  const T1 = (await editorApi.from("curriculum_topics").insert({ name: "ZZ Kiểm thử P11 Chủ đề", slug: "zz-kiem-thu-p11-chu-de", description: "Mô tả thử", workflow_status: "draft" }).select("id").single()).data.id;
  for (const [table, id] of [["historical_events", E1], ["historical_events", E2], ["historical_figures", F2], ["historical_locations", L2], ["curriculum_topics", T1]]) {
    const r = await editorApi.from(table).update({ workflow_status: "pending_review" }).eq("id", id);
    if (r.error) throw new Error("gửi duyệt " + table + ": " + r.error.message);
  }
  ok("setup_pending_added", (await countPending()) - baseline);

  // ---------- A. Hàng đợi ----------
  const rev = await newSession("reviewer@test.local");
  const rp = rev.page;
  await rp.goto(base + "/quan-tri/kiem-duyet");
  ok("A_queue_h1", await text(rp, "h1"));
  ok("A_sidebar_badge", await badge(rp));
  ok("A_tabs", (await rp.getByRole("navigation", { name: "Trạng thái nội dung" }).innerText()).replace(/\s+/g, " "));
  const items = await rp.locator("main ul > li").allInnerTexts();
  ok("A_queue_items_zz", items.filter((t) => t.includes("ZZ Kiểm thử P11")).length);
  await rp.screenshot({ path: `${out}/phase11-hang-doi.png`, fullPage: true });
  await rp.goto(base + "/quan-tri/kiem-duyet?loai=su-kien");
  ok("A_filter_su_kien", (await rp.locator("main ul > li").allInnerTexts()).filter((t) => t.includes("ZZ Kiểm thử P11")).length);

  // ---------- C. Màn hình duyệt sự kiện ----------
  await rp.goto(`${base}/quan-tri/kiem-duyet/su-kien/${E1}`);
  ok("C_preview_h1", await text(rp, "section[aria-label^='Xem trước'] h1"));
  ok("C_unpublished_badges", await rp.locator("section[aria-label^='Xem trước'] >> text=Chưa công bố").count());
  ok("C_notes", (await rp.locator("#luu-y ~ ul").innerText()).replace(/\s+/g, " "));
  ok("C_sources_shown", (await rp.locator("#nguon-doi-chieu").locator("xpath=..").innerText()).replace(/\s+/g, " ").includes("ZZ KIỂM THỬ P11 nguồn"));
  ok("C_checklist_items", await rp.locator("#checklist").locator("xpath=..").locator("input[type=checkbox]").count());
  ok("C_actions_pending", await buttons(rp, ["Yêu cầu chỉnh sửa", "Công bố", "Ẩn", "Công bố lại"]));
  await rp.screenshot({ path: `${out}/phase11-man-hinh-duyet.png`, fullPage: true });

  // ---------- D. Trả sửa: bắt buộc có lý do ----------
  await rp.getByRole("button", { name: "Yêu cầu chỉnh sửa", exact: true }).click();
  await rp.locator("#field-reason-error").waitFor();
  ok("D_reason_empty_error", await text(rp, "#field-reason-error"));
  ok("D_status_after_empty", (await statusOf("historical_events", E1)).workflow_status);
  await rp.locator("#field-reason").fill("ab");
  await rp.getByRole("button", { name: "Yêu cầu chỉnh sửa", exact: true }).click();
  await rp.getByText("quá ngắn").waitFor();
  ok("D_reason_short_error", await text(rp, "#field-reason-error"));
  await rp.screenshot({ path: `${out}/phase11-tra-sua-thieu-ly-do.png` });
  await rp.locator("#field-reason").fill("Mốc thời gian chưa khớp SGK trang 45, vui lòng kiểm tra lại.");
  await rp.getByRole("button", { name: "Yêu cầu chỉnh sửa", exact: true }).click();
  await rp.waitForURL(/thong-bao=da-tra-sua/);
  ok("D_notice", await text(rp, "[role=status]"));
  const afterRevise = await statusOf("historical_events", E1);
  ok("D_db_after_revise", { status: afterRevise.workflow_status, note: afterRevise.review_note });
  ok("D_badge_after", await badge(rp));

  // ---------- E. Biên tập viên thấy lý do, sửa và gửi lại ----------
  const ed = await newSession("editor@test.local");
  const ep = ed.page;
  await ep.goto(base + "/quan-tri/noi-dung/su-kien?trang-thai=needs_revision");
  ok("E_editor_list_sees_reason", (await ep.locator("main li", { hasText: "ZZ Kiểm thử P11 Sự kiện 1" }).first().innerText()).replace(/\s+/g, " "));
  await ep.goto(`${base}/quan-tri/noi-dung/su-kien/${E1}`);
  ok("E_editor_banner", await text(ep, "[role=note]"));
  ok("E_editor_can_edit", { titleDisabled: await ep.locator("#field-title").isDisabled(), saveButton: await ep.getByRole("button", { name: "Lưu", exact: true }).count() });
  await ep.screenshot({ path: `${out}/phase11-editor-thay-ly-do.png`, fullPage: true });
  await ep.locator("#field-summary").fill("Tóm tắt đã sửa theo yêu cầu kiểm duyệt");
  await ep.getByRole("button", { name: "Lưu", exact: true }).click();
  await ep.getByText("Đã lưu sự kiện.").waitFor();
  await ep.getByRole("button", { name: "Gửi kiểm duyệt" }).click();
  await ep.waitForURL(/thong-bao=da-gui-duyet/);
  ok("E_resubmitted_status", (await statusOf("historical_events", E1)).workflow_status);

  // ---------- F. Công bố ----------
  await rp.goto(`${base}/quan-tri/kiem-duyet/su-kien/${E1}`);
  ok("F_reviewer_sees_updated_summary", (await rp.locator("section[aria-label^='Xem trước']").innerText()).includes("Tóm tắt đã sửa theo yêu cầu kiểm duyệt"));
  dialogs.length = 0;
  await rp.getByRole("button", { name: "Công bố", exact: true }).click();
  await rp.waitForURL(/thong-bao=da-cong-bo/);
  ok("F_confirm_dialog", dialogs.map((d) => d.replace(/\n+/g, " | ")));
  ok("F_notice", await text(rp, "[role=status]"));
  const pub = await statusOf("historical_events", E1);
  ok("F_db_after_publish", { status: pub.workflow_status, note_cleared: pub.review_note === null });
  const pubHtml = await (await fetch(base + "/su-kien/zz-kiem-thu-p11-su-kien-1")).text();
  ok("F_public_page", { status: (await fetch(base + "/su-kien/zz-kiem-thu-p11-su-kien-1")).status, hidesDraftFigure: !pubHtml.includes("ZZ Nhân vật NHÁP P11"), hidesDraftLocation: !pubHtml.includes("ZZ Địa điểm NHÁP P11"), showsSummary: pubHtml.includes("Tóm tắt đã sửa theo yêu cầu kiểm duyệt") });
  ok("F_public_timeline", (await (await fetch(base + "/dong-thoi-gian")).text()).includes("ZZ Kiểm thử P11 Sự kiện 1"));
  ok("F_public_search", (await (await fetch(base + "/tra-cuu?q=zz+kiem+thu+p11")).text()).includes("ZZ Kiểm thử P11 Sự kiện 1"));
  ok("F_public_home_featured_or_topic", (await fetch(base + "/")).status);

  // ---------- G. Ẩn / công bố lại ----------
  await rp.goto(base + "/quan-tri/kiem-duyet?tab=published");
  ok("G_published_tab_has_item", (await rp.locator("main ul > li").allInnerTexts()).some((t) => t.includes("ZZ Kiểm thử P11 Sự kiện 1")));
  await rp.goto(`${base}/quan-tri/kiem-duyet/su-kien/${E1}`);
  ok("G_actions_published", await buttons(rp, ["Yêu cầu chỉnh sửa", "Công bố", "Ẩn", "Công bố lại"]));
  await rp.getByRole("button", { name: "Ẩn", exact: true }).click();
  await rp.waitForURL(/thong-bao=da-an/);
  ok("G_db_hidden", (await statusOf("historical_events", E1)).workflow_status);
  ok("G_public_404_when_hidden", (await fetch(base + "/su-kien/zz-kiem-thu-p11-su-kien-1")).status);
  ok("G_public_timeline_without", !(await (await fetch(base + "/dong-thoi-gian")).text()).includes("ZZ Kiểm thử P11 Sự kiện 1"));
  await rp.goto(base + "/quan-tri/kiem-duyet?tab=hidden");
  ok("G_hidden_tab_has_item", (await rp.locator("main ul > li").allInnerTexts()).some((t) => t.includes("ZZ Kiểm thử P11 Sự kiện 1")));
  await rp.goto(`${base}/quan-tri/kiem-duyet/su-kien/${E1}`);
  ok("G_actions_hidden", await buttons(rp, ["Yêu cầu chỉnh sửa", "Công bố", "Ẩn", "Công bố lại"]));
  await rp.getByRole("button", { name: "Công bố lại", exact: true }).click();
  await rp.waitForURL(/thong-bao=da-cong-bo-lai/);
  ok("G_db_republished", (await statusOf("historical_events", E1)).workflow_status);
  ok("G_public_back", (await fetch(base + "/su-kien/zz-kiem-thu-p11-su-kien-1")).status);

  // ---------- H. Xử lý đồng thời: hai tab cùng duyệt một bài ----------
  const revB = await newSession("reviewer@test.local");
  const bp = revB.page;
  await rp.goto(`${base}/quan-tri/kiem-duyet/su-kien/${E2}`);
  await bp.goto(`${base}/quan-tri/kiem-duyet/su-kien/${E2}`);
  ok("H_both_see_pending", { A: await buttons(rp, ["Công bố"]), B: await buttons(bp, ["Công bố"]) });
  await rp.getByRole("button", { name: "Công bố", exact: true }).click();
  await rp.waitForURL(/thong-bao=da-cong-bo/);
  // Tab B vẫn hiện bản chờ duyệt cũ → bấm Công bố
  await bp.getByRole("button", { name: "Công bố", exact: true }).click();
  await bp.getByText("xử lý bởi người khác").first().waitFor();
  ok("H_B_publish_stale_message", await text(bp, "[role=alert]"));
  ok("H_B_reload_button", await bp.getByRole("button", { name: "Tải lại trang" }).count());
  await bp.screenshot({ path: `${out}/phase11-xu-ly-dong-thoi.png`, fullPage: true });
  ok("H_db_still_published_once", (await statusOf("historical_events", E2)).workflow_status);
  // Tab B thử "Yêu cầu chỉnh sửa" trên bản đã bị xử lý
  await bp.locator("#field-reason").fill("Lý do gửi từ tab cũ sau khi bài đã được công bố.");
  await bp.getByRole("button", { name: "Yêu cầu chỉnh sửa", exact: true }).click();
  await bp.getByText("xử lý bởi người khác").nth(1).waitFor({ timeout: 8000 }).catch(() => {});
  const afterStaleRevise = await statusOf("historical_events", E2);
  ok("H_B_revise_stale_status_unchanged", { status: afterStaleRevise.workflow_status, note: afterStaleRevise.review_note });
  await bp.getByRole("button", { name: "Tải lại trang" }).first().click();
  await bp.waitForTimeout(1500);
  ok("H_B_after_reload_actions", await buttons(bp, ["Yêu cầu chỉnh sửa", "Công bố", "Ẩn", "Công bố lại"]));
  await revB.ctx.close();

  // ---------- I. Các loại nội dung khác ----------
  for (const [seg, id, table, publicPath] of [
    ["nhan-vat", F2, "historical_figures", "/nhan-vat/zz-kiem-thu-p11-nv"],
    ["dia-diem", L2, "historical_locations", "/dia-diem/zz-kiem-thu-p11-dd"],
    ["chu-de", T1, "curriculum_topics", "/chu-de/zz-kiem-thu-p11-chu-de"],
  ]) {
    await rp.goto(`${base}/quan-tri/kiem-duyet/${seg}/${id}`);
    const before = (await fetch(base + publicPath)).status;
    const previewH1 = await text(rp, "section[aria-label^='Xem trước'] h1");
    const actions = await buttons(rp, ["Yêu cầu chỉnh sửa", "Công bố"]);
    if (seg === "dia-diem") await rp.screenshot({ path: `${out}/phase11-duyet-dia-diem.png`, fullPage: true });
    await rp.getByRole("button", { name: "Công bố", exact: true }).click();
    await rp.waitForURL(/thong-bao=da-cong-bo/);
    ok("I_" + seg, { previewH1, publicBefore: before, actions, dbStatus: (await statusOf(table, id)).workflow_status, publicAfter: (await fetch(base + publicPath)).status });
  }

  // ---------- J. Phân quyền ----------
  await ep.goto(base + "/quan-tri/kiem-duyet");
  ok("J_editor_queue_forbidden", ep.url().replace(base, ""));
  await ep.goto(`${base}/quan-tri/kiem-duyet/su-kien/${E2}`);
  ok("J_editor_review_page_forbidden", ep.url().replace(base, ""));
  const adm = await newSession("admin@test.local");
  await adm.page.goto(`${base}/quan-tri/kiem-duyet/su-kien/${E2}`);
  ok("J_admin_can_review", await buttons(adm.page, ["Ẩn"]));
  await adm.page.goto(`${base}/quan-tri/kiem-duyet/su-kien/khong-phai-uuid`);
  ok("J_bad_id_404", await adm.page.locator("h1").first().innerText());
  await adm.ctx.close();
  await ed.ctx.close();
  await rev.ctx.close();
} catch (e) {
  res.FAILED = String(e).slice(0, 800);
} finally {
  await cleanup();
  res.cleanupLeft = {
    events: (await admin.from("historical_events").select("id").like("slug", "zz-kiem-thu-p11-%")).data?.length,
    figures: (await admin.from("historical_figures").select("id").like("slug", "zz-kiem-thu-p11-%")).data?.length,
    locations: (await admin.from("historical_locations").select("id").like("slug", "zz-kiem-thu-p11-%")).data?.length,
    topics: (await admin.from("curriculum_topics").select("id").like("slug", "zz-kiem-thu-p11-%")).data?.length,
    pendingNow: await countPending(),
  };
  await browser.close();
}
console.log(JSON.stringify(res, null, 1));
