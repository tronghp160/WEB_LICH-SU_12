import { unstable_rethrow } from "next/navigation";
import { isAttemptId } from "@/lib/exams/attempt";
import { attemptResponse, failure, NO_STORE, readAnswersBody, readCaller, submitExamAttempt } from "@/lib/exams/attempts-server";

// Nộp bài (docs/ke-hoach-luyen-thi.md, GĐ2): lưu lần cuối (nếu chưa quá hạn + 30 giây), CHẤM trong SQL, trả kết quả
// kèm đáp án và lời giải. Nộp lại một lượt đã nộp → trả kết quả cũ.

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAttemptId(id)) return failure("not_found");
  try {
    const body = await readAnswersBody(request);
    if (!body) return Response.json({ ok: false, reason: "invalid_body" }, { status: 400, headers: NO_STORE });
    const { data, error } = await submitExamAttempt(id, await readCaller(request), body);
    return error ? Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE }) : attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
