import { unstable_rethrow } from "next/navigation";
import { attemptResponse, failure, NO_STORE, rateLimited, readCaller, startPaperAttempt } from "@/lib/exams/attempts-server";

// Bản in đề (docs/ke-hoach-luyen-thi.md, mục 4.9 — GĐ8): tạo (hoặc mở lại) lượt chế độ `paper` — câu hỏi KHÔNG có đáp án,
// thứ tự lựa chọn đúng như sẽ chấm. Cùng quyền như làm online (đề miễn phí / gói). Dùng chung hạn mức bắt đầu lượt.

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return failure("not_found");
  try {
    const caller = await readCaller(request);
    if (!caller.userId && !caller.deviceHash) return failure("no_device");
    if (await rateLimited("exam_start", caller.userId ? `user:${caller.userId}` : `device:${caller.deviceHash}`)) return failure("rate_limited");
    const { data, error } = await startPaperAttempt(slug, caller);
    return error ? Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE }) : attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
