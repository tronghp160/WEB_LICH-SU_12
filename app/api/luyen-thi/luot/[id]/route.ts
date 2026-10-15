import { unstable_rethrow } from "next/navigation";
import { isAttemptId } from "@/lib/exams/attempt";
import {
  attemptPercentile,
  attemptResponse,
  failure,
  getAttemptResult,
  NO_STORE,
  rateLimited,
  readAnswersBody,
  readCaller,
  saveAttemptAnswers,
} from "@/lib/exams/attempts-server";

// Một lượt làm bài (docs/ke-hoach-luyen-thi.md, GĐ2). Chỉ chủ lượt (đúng tài khoản, hoặc đúng thiết bị nếu lượt tạo khi
// chưa đăng nhập) đọc / ghi được — hàm SQL tự kiểm; người khác nhận 404 như lượt không tồn tại.

const unavailable = () => Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });

/**
 * Trạng thái lượt: đang làm → câu hỏi không đáp án (làm tiếp); đã nộp → kết quả kèm đáp án, lời giải, và thứ hạng so với
 * các lượt nộp khác của đề khi đủ 30 lượt (mục 4.2 — không bao giờ có tên người khác).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAttemptId(id)) return failure("not_found");
  try {
    const { data, error } = await getAttemptResult(id, await readCaller(request));
    if (error) return unavailable();
    const body = data as { ok?: boolean; attempt?: { status?: string } } | null;
    if (body?.ok && body.attempt?.status === "submitted") {
      const percentile = await attemptPercentile(id);
      if (percentile !== null) return attemptResponse({ ...body, percentile });
    }
    return attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return unavailable();
  }
}

/** Lưu câu trả lời: { answers: { "<item_id>": {...} } } ≤ 32 KB. Giới hạn 300 lần / 10 phút / lượt. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAttemptId(id)) return failure("not_found");
  try {
    const body = await readAnswersBody(request);
    if (!body) return Response.json({ ok: false, reason: "invalid_body" }, { status: 400, headers: NO_STORE });
    if (await rateLimited("exam_save", `attempt:${id}`)) return failure("rate_limited");
    const { data, error } = await saveAttemptAnswers(id, await readCaller(request), body);
    return error ? unavailable() : attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return unavailable();
  }
}
