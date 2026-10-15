import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";

// Luyện thi GĐ2 (docs/ke-hoach-luyen-thi.md): lượt làm bài, chấm phía server — trên DB thật, đề miễn phí `de-1` (đã
// công bố). Không cần tài khoản: chủ lượt là mã thiết bị (header x-device-id). Mỗi ca dùng thiết bị mới.
// Kiểm: tải đề KHÔNG có đáp án / lời giải, làm tiếp, lượt của máy khác bị chặn, nộp mới có đáp án.

const SLUG = "de-1";
const REVEALING = /"(correct_index|truths|explanation|statement_explanations|is_true)"/;
const device = () => ({ "x-device-id": randomUUID() });

async function start(request: APIRequestContext, headers: Record<string, string>) {
  const response = await request.post(`/api/luyen-thi/${SLUG}/bat-dau`, { headers });
  expect(response.status()).toBe(200);
  const text = await response.text();
  return { text, body: JSON.parse(text) as { attempt: { id: string; deadline_at: string }; questions: { item_id: string; choices: string[] }[] } };
}

test.describe("Lượt làm bài — API (GĐ2)", () => {
  test("trang đề và lúc bắt đầu KHÔNG trả đáp án, lời giải; nộp xong mới có", async ({ request }) => {
    const headers = device();
    const intro = await request.get(`/api/luyen-thi/${SLUG}`, { headers });
    expect(intro.status()).toBe(200);
    const introText = await intro.text();
    expect(introText).not.toMatch(REVEALING);
    expect(JSON.parse(introText)).toMatchObject({ ok: true, access: "free", question_count: 10, in_progress: null });
    expect(introText).not.toContain('"questions"');
    expect(intro.headers()["cache-control"]).toContain("no-store");

    const { text, body } = await start(request, headers);
    expect(text).not.toMatch(REVEALING);
    expect(body.questions).toHaveLength(10);
    expect(Date.parse(body.attempt.deadline_at)).toBeGreaterThan(Date.now() + 14 * 60_000);

    const answers = Object.fromEntries(body.questions.map((question) => [question.item_id, { choice: 0 }]));
    const submitted = await request.post(`/api/luyen-thi/luot/${body.attempt.id}/nop`, { headers, data: { answers } });
    expect(submitted.status()).toBe(200);
    const result = await submitted.json();
    expect(result.attempt.status).toBe("submitted");
    expect(typeof result.attempt.score10).toBe("number");
    expect(result.questions[0]).toHaveProperty("correct_index");
    expect(result.questions[0]).toHaveProperty("explanation");

    // Đã nộp: lưu bị từ chối (409); nộp lại trả kết quả cũ.
    const late = await request.patch(`/api/luyen-thi/luot/${body.attempt.id}`, { headers, data: { answers } });
    expect(late.status()).toBe(409);
    const again = await request.post(`/api/luyen-thi/luot/${body.attempt.id}/nop`, { headers, data: { answers: {} } });
    expect((await again.json()).attempt.score10).toBe(result.attempt.score10);
  });

  test("bắt đầu lại khi đang làm dở → cùng lượt, câu trả lời đã lưu còn nguyên", async ({ request }) => {
    const headers = device();
    const first = await start(request, headers);
    const itemId = first.body.questions[2].item_id;
    const saved = await request.patch(`/api/luyen-thi/luot/${first.body.attempt.id}`, { headers, data: { answers: { [itemId]: { choice: 3, flagged: true } } } });
    expect(saved.status()).toBe(200);

    const intro = await (await request.get(`/api/luyen-thi/${SLUG}`, { headers })).json();
    expect(intro.in_progress.id).toBe(first.body.attempt.id);
    const second = await start(request, headers);
    expect(second.body.attempt.id).toBe(first.body.attempt.id);
    expect(JSON.parse(second.text).answers[itemId]).toEqual({ choice: 3, flagged: true });
  });

  test("máy khác không xem / lưu / nộp được lượt; thân sai dạng hoặc quá lớn bị từ chối", async ({ request }) => {
    const owner = device();
    const { body } = await start(request, owner);
    const other = device();
    const url = `/api/luyen-thi/luot/${body.attempt.id}`;
    expect((await request.get(url, { headers: other })).status()).toBe(404);
    expect((await request.patch(url, { headers: other, data: { answers: {} } })).status()).toBe(404);
    expect((await request.post(`${url}/nop`, { headers: other, data: { answers: {} } })).status()).toBe(404);
    expect((await request.get(url)).status()).toBe(404);

    expect((await request.patch(url, { headers: owner, data: { answers: { [body.questions[0].item_id]: { choice: 9 } } } })).status()).toBe(400);
    expect((await request.patch(url, { headers: owner, data: "x".repeat(40_000) })).status()).toBe(400);
    expect((await request.get(`/api/luyen-thi/luot/khong-phai-uuid`, { headers: owner })).status()).toBe(404);
    // Lượt vẫn đang làm, chưa bị ai nộp.
    expect((await (await request.get(url, { headers: owner })).json()).attempt.status).toBe("in_progress");
  });

  test("đề trong gói: chưa kích hoạt thì không bắt đầu được", async ({ request }) => {
    const response = await request.post(`/api/luyen-thi/de-2/bat-dau`, { headers: device() });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ ok: false, reason: "invalid_code" });
  });
});

test.describe("Lượt làm bài — giao diện (GĐ2)", () => {
  test("tải lại trang giữa chừng → bấm Bắt đầu để làm tiếp, đáp án đã chọn còn nguyên, đồng hồ không đặt lại", async ({ page }) => {
    const responses: string[] = [];
    page.on("response", async (response) => {
      if (/\/api\/luyen-thi\/de-1(\/bat-dau)?$/.test(new URL(response.url()).pathname)) responses.push(await response.text());
    });
    await page.goto(`/luyen-thi/${SLUG}`);
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.getByRole("list", { name: "Các đáp án" }).getByRole("button").nth(2).click();
    // Đợi lưu tự động (2 giây sau lần chọn cuối).
    await page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/luyen-thi/luot/"));

    await page.reload();
    await expect(page.getByTestId("exam-in-progress")).toContainText("Em đang làm dở bài này");
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await expect(page.getByRole("list", { name: "Các đáp án" }).getByRole("button").nth(2)).toHaveAttribute("aria-pressed", "true");
    const remaining = await page.getByRole("timer").textContent();
    expect(remaining).not.toContain("15:00");
    for (const text of responses) expect(text).not.toMatch(REVEALING);
  });
});
