import { unstable_rethrow } from "next/navigation";
import { attemptResponse, failure, NO_STORE, rateLimited, readCaller, readJsonBody, reportExamItem } from "@/lib/exams/attempts-server";
import { reportBodySchema } from "@/lib/exams/quality";

// Báo lỗi một câu hỏi (docs/ke-hoach-luyen-thi.md, mục 4.10 — GĐ7). Chỉ câu thuộc lượt CỦA người gọi mà người gọi đã thấy
// đáp án (lượt thi đã nộp / câu luyện tập đã kiểm tra) — hàm SQL report_exam_item kiểm. Mỗi người một báo cáo đang mở cho
// mỗi câu; 10 lần / 10 phút.

export async function POST(request: Request) {
  try {
    const caller = await readCaller(request);
    if (!caller.userId && !caller.deviceHash) return failure("no_device");
    const body = await readJsonBody(request, reportBodySchema);
    if (!body) return failure("invalid");
    if (await rateLimited("exam_report", caller.userId ? `user:${caller.userId}` : `device:${caller.deviceHash}`)) return failure("rate_limited");
    const { data, error } = await reportExamItem(caller, body);
    return error ? Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE }) : attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
