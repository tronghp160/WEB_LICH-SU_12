import { unstable_rethrow } from "next/navigation";
import { attemptResponse, failure, NO_STORE, rateLimited, readCaller, startExamAttempt } from "@/lib/exams/attempts-server";

// Bắt đầu (hoặc làm tiếp) một lượt làm đề — docs/ke-hoach-luyen-thi.md, GĐ2. Trả câu hỏi KHÔNG kèm đáp án / lời giải,
// câu trả lời đã lưu và hạn nộp theo giờ server. Giới hạn 30 lần / 10 phút / tài khoản hoặc thiết bị.

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return failure("not_found");
  try {
    const caller = await readCaller(request);
    if (!caller.userId && !caller.deviceHash) return failure("no_device");
    if (await rateLimited("exam_start", caller.userId ? `user:${caller.userId}` : `device:${caller.deviceHash}`)) return failure("rate_limited");
    const { data, error } = await startExamAttempt(slug, caller);
    return error ? Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE }) : attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
