import { unstable_rethrow } from "next/navigation";
import type { Json } from "@/lib/database.types";
import { checkBodySchema, isAttemptId } from "@/lib/exams/attempt";
import { attemptResponse, checkAttemptItem, failure, NO_STORE, rateLimited, readCaller, readJsonBody } from "@/lib/exams/attempts-server";

// "Kiểm tra" một câu của lượt luyện tập (docs/ke-hoach-luyen-thi.md, mục 4.3): server lưu câu trả lời, KHÓA câu, chấm,
// cập nhật sổ câu sai và trả đáp án + lời giải của ĐÚNG câu đó (câu khác vẫn ẩn). Chưa có gói: 10 câu / ngày → 429
// `quota`. Giới hạn chung với lưu bài: 300 lần / 10 phút / lượt.

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAttemptId(id)) return failure("not_found");
  try {
    const body = await readJsonBody(request, checkBodySchema);
    if (!body) return Response.json({ ok: false, reason: "invalid_body" }, { status: 400, headers: NO_STORE });
    if (await rateLimited("exam_save", `attempt:${id}`)) return failure("rate_limited");
    const { data, error } = await checkAttemptItem(id, await readCaller(request), body.item_id, body.answer as Json);
    return error ? Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE }) : attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
