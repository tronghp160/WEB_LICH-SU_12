import { unstable_rethrow } from "next/navigation";
import { practiceOptionsSchema } from "@/lib/exams/attempt";
import { attemptResponse, failure, NO_STORE, rateLimited, readCaller, readJsonBody, startPracticeAttempt } from "@/lib/exams/attempts-server";

// Bắt đầu lượt luyện tập (docs/ke-hoach-luyen-thi.md, mục 4.3, 4.5 — GĐ4): theo bài / dạng / mức độ, ôn câu đến hạn
// (tài khoản có gói), hoặc làm lại câu chưa đạt của một lượt của mình. Câu do server chọn; trả câu hỏi KHÔNG kèm đáp án.
// Giới hạn chung với bắt đầu lượt thi: 30 lần / 10 phút.

export async function POST(request: Request) {
  try {
    const options = await readJsonBody(request, practiceOptionsSchema);
    if (!options) return Response.json({ ok: false, reason: "invalid_body" }, { status: 400, headers: NO_STORE });
    const caller = await readCaller(request);
    if (!caller.userId && !caller.deviceHash) return failure("no_device");
    if (await rateLimited("exam_start", caller.userId ? `user:${caller.userId}` : `device:${caller.deviceHash}`)) return failure("rate_limited");
    const { data, error } = await startPracticeAttempt(caller, options);
    return error ? Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE }) : attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
