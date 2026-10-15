import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { TEST_PW, asUser, login } from "./support";

// Luyện thi GĐ1 (docs/ke-hoach-luyen-thi.md): ngân hàng câu hỏi, câu Đúng/Sai + tư liệu, nhập JSON, duyệt hàng loạt, ghép đề
// đầy đủ 24 + 4 từ ngân hàng — trên DB THẬT. Cần migration 20261025000000_exam_bank.sql và TEST_PW (tài khoản @test.local).
// Dữ liệu thử: câu / tư liệu bắt đầu bằng "ZZ KIỂM THỬ NH", đề "ZZ KIỂM THỬ E2E đề" — dọn ở cuối (kể cả khi lỗi).

test.skip(!TEST_PW, "Cần biến môi trường TEST_PW (mật khẩu chung của tài khoản @test.local)");

const PREFIX = "ZZ KIỂM THỬ NH";
const run = Date.now().toString(36);

async function staff(browser: Browser, email: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  await login(page, email);
  return { context, page };
}

const statements = (tag: string) =>
  ["a", "b", "c", "d"].map((letter, index) => ({ text: `${letter}) ${PREFIX} ${run} ý ${letter} ${tag}`, is_true: index % 2 === 0, explanation: `Giải thích ý ${letter}` }));

/** Tệp JSON đề đầy đủ: 24 câu trắc nghiệm (đáp án đúng luôn ở vị trí 0) + 4 câu Đúng/Sai, 2 câu dùng tư liệu. */
function fullBankFile() {
  const levels = ["nhan_biet", "thong_hieu", "van_dung"];
  const mcq = Array.from({ length: 24 }, (_, index) => ({
    kind: "mcq",
    stem: `${PREFIX} ${run} câu trắc nghiệm ${index + 1}?`,
    choices: [`Đúng ${index + 1}`, `Sai một ${index + 1}`, `Sai hai ${index + 1}`, `Sai ba ${index + 1}`],
    correct: 0,
    explanation: "Giải thích thử cho câu trắc nghiệm.",
    grade: 12,
    lesson_slug: "7-khang-chien-chong-phap",
    level: levels[index < 10 ? 0 : index < 17 ? 1 : 2],
    competency: "tim_hieu_lich_su",
    source_note: "SGK Lịch sử 12 (KNTT), Bài 7",
  }));
  const trueFalse = Array.from({ length: 4 }, (_, index) => ({
    kind: "true_false",
    passage: index < 2 ? "tl-1" : undefined,
    stem: `${PREFIX} ${run} câu Đúng/Sai ${index + 1}:`,
    statements: statements(String(index + 1)),
    explanation: "Nhận xét chung thử.",
    grade: 12,
    lesson_slug: "7-khang-chien-chong-phap",
    level: index < 2 ? "van_dung" : "thong_hieu",
    competency: "van_dung_kien_thuc",
    source_note: "SGK Lịch sử 12 (KNTT), Bài 7",
  }));
  return {
    passages: [{ key: "tl-1", title: `${PREFIX} ${run} tư liệu nhập`, body: "Đoạn tư liệu thử nhập từ tệp JSON, đủ ba mươi ký tự.", source_citation: "Nguồn thử, tr. 1" }],
    items: [...mcq, ...trueFalse],
  };
}

async function cleanup() {
  const admin = await asUser("admin@test.local");
  await admin.from("exam_sets").delete().like("title", "ZZ KIỂM THỬ E2E đề%");
  await admin.from("exam_items").delete().like("stem", `${PREFIX}%`);
  await admin.from("exam_passages").delete().like("title", `${PREFIX}%`);
}

test.describe.serial("Ngân hàng câu hỏi và soạn đề (GĐ1)", () => {
  let setSlug = "";
  test.afterAll(cleanup);

  test("biên tập viên soạn câu trắc nghiệm bằng form → xem trước có đáp án; lựa chọn trùng bị báo đúng ô", async ({ browser }) => {
    const { context, page } = await staff(browser, "editor@test.local");
    await page.goto("/quan-tri/ngan-hang-cau-hoi");
    await page.getByRole("link", { name: "Câu Trắc nghiệm mới" }).click();
    await page.locator("#field-stem").fill(`${PREFIX} ${run} soạn tay: Điện Biên Phủ kết thúc ngày nào?`);
    for (const [index, text] of ["Sai một", "Đúng", "Sai hai", "sai một"].entries()) await page.locator(`#field-choice_${index}`).fill(text);
    await page.getByLabel("Lựa chọn B là đáp án đúng").check();
    await page.locator("#field-explanation").fill("Giải thích thử cho câu soạn tay.");
    await page.locator("#field-level").selectOption("thong_hieu");
    await page.locator("#field-competency").selectOption("nhan_thuc_tu_duy");
    await page.locator("#field-source_note").fill("SGK Lịch sử 12, Bài 7");
    await page.getByRole("button", { name: "Tạo câu hỏi" }).click();
    await expect(page.locator("#field-choice_3-error")).toHaveText("Lựa chọn này trùng với một lựa chọn khác.");

    await page.locator("#field-choice_3").fill("Sai ba");
    await page.getByRole("button", { name: "Tạo câu hỏi" }).click();
    await expect(page).toHaveURL(/\/quan-tri\/ngan-hang-cau-hoi\/[0-9a-f-]{36}\?thong-bao=da-tao$/);
    const preview = page.getByRole("region", { name: /Xem trước/ });
    await expect(preview.getByLabel("Đáp án đúng")).toHaveCount(1);
    await expect(preview.locator("li").filter({ has: page.getByLabel("Đáp án đúng") })).toContainText("Đúng");
    await context.close();
  });

  test("tư liệu + câu Đúng/Sai: thiếu chọn Đúng/Sai ở một ý → báo lỗi ý đó; đủ → xem trước 4 ý kèm tư liệu", async ({ browser }) => {
    const { context, page } = await staff(browser, "editor@test.local");
    await page.goto("/quan-tri/ngan-hang-cau-hoi/tu-lieu/moi");
    await page.locator("#field-title").fill(`${PREFIX} ${run} tư liệu tay`);
    await page.locator("#field-body").fill("Đoạn tư liệu thử soạn tay trên giao diện quản trị, đủ ba mươi ký tự.");
    await page.locator("#field-source_citation").fill("Nguồn thử soạn tay, tr. 2");
    await page.getByRole("button", { name: "Tạo tư liệu" }).click();
    await expect(page).toHaveURL(/tu-lieu\/[0-9a-f-]{36}\?thong-bao=da-tao$/);

    await page.goto("/quan-tri/ngan-hang-cau-hoi/moi?dang=dung-sai");
    await page.locator("#field-passage_id").selectOption({ label: `${PREFIX} ${run} tư liệu tay (Bản nháp)` });
    await page.locator("#field-stem").fill(`${PREFIX} ${run} đọc tư liệu tay:`);
    for (const [index, statement] of statements("tay").entries()) {
      await page.locator(`#field-statement_${index}`).fill(statement.text);
      await page.locator(`#field-statement_${index}_explanation`).fill(statement.explanation);
      if (index !== 2) await page.getByRole("radiogroup", { name: `Ý ${"abcd"[index]}) đúng hay sai` }).getByLabel(statement.is_true ? "Đúng" : "Sai").check();
    }
    await page.locator("#field-explanation").fill("Nhận xét chung thử.");
    await page.locator("#field-level").selectOption("van_dung");
    await page.locator("#field-competency").selectOption("van_dung_kien_thuc");
    await page.locator("#field-source_note").fill("SGK Lịch sử 12, Bài 7");
    await page.getByRole("button", { name: "Tạo câu hỏi" }).click();
    await expect(page.getByText("Chọn ý này Đúng hay Sai.")).toBeVisible();

    await page.getByRole("radiogroup", { name: "Ý c) đúng hay sai" }).getByLabel("Đúng").check();
    await page.getByRole("button", { name: "Tạo câu hỏi" }).click();
    await expect(page).toHaveURL(/\?thong-bao=da-tao$/);
    const preview = page.getByRole("region", { name: /Xem trước/ });
    await expect(preview.getByText("Nguồn: Nguồn thử soạn tay, tr. 2")).toBeVisible();
    await expect(preview.getByText("Đúng", { exact: true })).toHaveCount(2);
    await expect(preview.getByText("Sai", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Đoạn tư liệu chưa công bố — được gửi duyệt / công bố cùng câu.")).toBeVisible();
    await context.close();
  });

  test("nhập JSON: kiểm tra báo lỗi từng dòng, chưa ghi; sửa xong → ghi 28 câu + 1 tư liệu ở trạng thái nháp", async ({ browser }) => {
    const { context, page } = await staff(browser, "editor@test.local");
    await page.goto("/quan-tri/ngan-hang-cau-hoi/nhap");
    const file = fullBankFile();
    const broken = { ...file, items: [...file.items, { ...file.items[0] }, { ...file.items[1], level: "kho" }] };
    await page.locator("#noi-dung-json").fill(JSON.stringify(broken));
    await page.getByRole("button", { name: "Kiểm tra (chưa ghi)" }).click();
    await expect(page.getByText("Tệp còn lỗi — sửa rồi kiểm tra lại. Chưa ghi gì.")).toBeVisible();
    await expect(page.getByText("Trùng với câu 1 trong tệp.")).toBeVisible();
    await expect(page.getByText("Vui lòng chọn mức độ.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ghi vào ngân hàng" })).toBeDisabled();

    await page.locator("#noi-dung-json").fill(JSON.stringify(file));
    await page.getByRole("button", { name: "Kiểm tra (chưa ghi)" }).click();
    await expect(page.getByText("Hợp lệ: 28 câu, 1 đoạn tư liệu.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Ghi vào ngân hàng" }).click();
    await expect(page.getByText("Đã ghi 28 câu và 1 đoạn tư liệu vào ngân hàng (trạng thái nháp).")).toBeVisible();

    // Nhập lại cùng tệp → mọi câu bị báo trùng ngân hàng.
    await page.getByRole("button", { name: "Kiểm tra (chưa ghi)" }).click();
    await expect(page.getByText("Trùng với một câu đã có trong ngân hàng.").first()).toBeVisible();
    await context.close();
  });

  test("gửi duyệt hàng loạt (biên tập viên) → công bố hàng loạt (kiểm duyệt viên); tư liệu công bố theo câu", async ({ browser }) => {
    const editor = await staff(browser, "editor@test.local");
    await editor.page.goto(`/quan-tri/ngan-hang-cau-hoi?q=${encodeURIComponent(`${PREFIX} ${run} câu`)}`);
    await expect(editor.page.getByText("28 câu")).toBeVisible();
    await editor.page.getByLabel("Chọn cả trang").check();
    await editor.page.getByRole("button", { name: "Gửi duyệt các câu đã chọn" }).click();
    await expect(editor.page.getByText("Đã gửi duyệt 28 câu.")).toBeVisible();
    await editor.context.close();

    const reviewer = await staff(browser, "reviewer@test.local");
    await reviewer.page.goto(`/quan-tri/ngan-hang-cau-hoi?trang-thai=pending_review&q=${encodeURIComponent(`${PREFIX} ${run} câu`)}`);
    await reviewer.page.getByLabel("Chọn cả trang").check();
    await reviewer.page.getByRole("button", { name: "Công bố các câu đã chọn" }).click();
    await expect(reviewer.page.getByText("Đã công bố 28 câu.")).toBeVisible();
    await reviewer.context.close();

    const admin = await asUser("admin@test.local");
    const { data: passage } = await admin.from("exam_passages").select("workflow_status").eq("title", `${PREFIX} ${run} tư liệu nhập`).single();
    expect(passage?.workflow_status).toBe("published");
  });

  test("ghép đề đầy đủ 24 + 4 từ ngân hàng: rải đều đáp án, đủ điều kiện gửi duyệt, chưa công bố được (chờ phòng thi GĐ3)", async ({ browser }) => {
    const { context, page } = await staff(browser, "editor@test.local");
    await page.goto("/quan-tri/de-luyen-thi");
    await page.getByRole("button", { name: "Tạo đề mới" }).click();
    await expect(page).toHaveURL(/\/quan-tri\/de-luyen-thi\/de-\d+$/);
    setSlug = page.url().split("/").pop() ?? "";
    await page.locator("#field-title").fill(`ZZ KIỂM THỬ E2E đề ${run}`);
    await page.getByRole("button", { name: "Lưu thông tin đề" }).click();
    await expect(page.getByText("Đã lưu thông tin đề.")).toBeVisible();
    await expect(page.getByText(/Đề đầy đủ cần đúng 24 câu trắc nghiệm \+ 4 câu Đúng\/Sai \(hiện có 0/)).toBeVisible();

    // Một câu thêm bằng giao diện (ô tìm câu), các câu còn lại thêm bằng phiên biên tập viên (cùng RLS) cho nhanh.
    await page.locator("#tim-cau").fill(`${PREFIX} ${run} câu trắc nghiệm 1?`);
    await page.getByRole("button", { name: "Lọc" }).click();
    await page.getByRole("list", { name: "Câu có thể thêm" }).getByRole("button", { name: "Thêm vào đề" }).first().click();
    await expect(page.getByText("Đã thêm câu vào đề.")).toBeVisible();

    const editorApi = await asUser("editor@test.local");
    const { data: set } = await editorApi.from("exam_sets").select("id").eq("slug", setSlug).single();
    const { data: items } = await editorApi.from("exam_items").select("id, kind, stem").like("stem", `${PREFIX} ${run} câu %`).order("stem");
    const { data: present } = await editorApi.from("exam_set_items").select("item_id").eq("set_id", set!.id);
    const rest = items!.filter((item) => !present!.some((row) => row.item_id === item.id));
    let mcq = 1;
    let tf = 0;
    const rows = rest.map((item) => (item.kind === "mcq" ? { set_id: set!.id, item_id: item.id, section: 1, position: ++mcq } : { set_id: set!.id, item_id: item.id, section: 2, position: ++tf }));
    const { error } = await editorApi.from("exam_set_items").insert(rows);
    expect(error).toBeNull();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Phần I — Trắc nghiệm (24/24 câu)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Phần II — Đúng/Sai (4/4 câu)" })).toBeVisible();
    // Mọi câu nhập đều có đáp án ở A và chưa xoay (thêm thẳng) → cảnh báo dồn A; bấm rải đều thì hết.
    await expect(page.getByText(/Đáp án đúng dồn vào A/)).toBeVisible();
    await page.getByRole("button", { name: "Rải đều đáp án A/B/C/D" }).click();
    await expect(page.getByText("Đã rải đều đáp án đúng A/B/C/D.")).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Đáp án đúng dồn vào/)).toHaveCount(0);
    for (const letter of ["A", "B", "C", "D"]) await expect(page.getByText(`· đáp án ${letter}`)).toHaveCount(6);

    await expect(page.getByText(/chưa công bố được/)).toBeVisible();
    await page.getByRole("button", { name: "Gửi duyệt" }).click();
    await expect(page.getByText("Đã gửi đề cho kiểm duyệt viên.")).toBeVisible();
    await context.close();

    const reviewer = await staff(browser, "reviewer@test.local");
    await reviewer.page.goto(`/quan-tri/de-luyen-thi/${setSlug}`);
    await reviewer.page.getByRole("button", { name: "Công bố", exact: true }).click();
    await expect(reviewer.page.getByText(/Chưa công bố được: Học sinh chưa làm được câu Đúng\/Sai/)).toBeVisible();
    await reviewer.page.getByLabel("Lý do yêu cầu chỉnh sửa (bắt buộc khi trả về)").fill("Chờ phòng thi mới (GĐ3) rồi công bố.");
    await reviewer.page.getByRole("button", { name: "Yêu cầu chỉnh sửa" }).click();
    await expect(reviewer.page.getByText("Đã cập nhật trạng thái đề.")).toBeVisible();
    await reviewer.context.close();
  });

  test("câu đang nằm trong đề không xóa được; gỡ khỏi đề rồi mới xóa; xóa đề nháp giữ câu trong ngân hàng", async ({ browser }) => {
    expect(setSlug).not.toBe("");
    const { context, page } = await staff(browser, "editor@test.local");
    const editorApi = await asUser("editor@test.local");
    const { data: item } = await editorApi.from("exam_items").insert({
      kind: "mcq",
      stem: `${PREFIX} ${run} câu nháp để xóa?`,
      choices: ["Một", "Hai", "Ba", "Bốn"],
      correct_index: 0,
      explanation: "Giải thích thử.",
      level: "nhan_biet",
      competency: "tim_hieu_lich_su",
      source_note: "SGK",
    }).select("id").single();
    const { data: set } = await editorApi.from("exam_sets").select("id").eq("slug", setSlug).single();
    await editorApi.from("exam_set_items").insert({ set_id: set!.id, item_id: item!.id, section: 1, position: 99 });

    await page.goto(`/quan-tri/ngan-hang-cau-hoi/${item!.id}`);
    await page.getByRole("button", { name: "Xóa câu nháp" }).click();
    await expect(page.getByText(/Không xóa được: câu \/ tư liệu đang được dùng trong đề/)).toBeVisible();

    await page.goto(`/quan-tri/de-luyen-thi/${setSlug}`);
    await page.getByRole("button", { name: "Xóa đề nháp" }).click();
    await expect(page).toHaveURL(/\/quan-tri\/de-luyen-thi$/);
    const { count } = await editorApi.from("exam_items").select("id", { count: "exact", head: true }).like("stem", `${PREFIX} ${run} câu %`);
    expect(count).toBe(29);

    await page.goto(`/quan-tri/ngan-hang-cau-hoi/${item!.id}`);
    await page.getByRole("button", { name: "Xóa câu nháp" }).click();
    await expect(page).toHaveURL(/\/quan-tri\/ngan-hang-cau-hoi\?thong-bao=da-xoa$/);
    setSlug = "";
    await context.close();
  });
});
