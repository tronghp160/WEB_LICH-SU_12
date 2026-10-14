import { unstable_rethrow } from "next/navigation";
import { DEVICE_HEADER, LICENSE_HEADER } from "@/lib/exams/exam";
import { fetchExam } from "@/lib/payments/licenses";

// Câu hỏi của một đề luyện thi (docs/ke-hoach-thanh-toan.md, mục 7.2). Mã kích hoạt + mã thiết bị đi trong header
// (không nằm trong URL). Không bao giờ lưu đệm: câu hỏi đề trả phí chỉ dành cho máy đã kích hoạt.

const NO_STORE = { "Cache-Control": "private, no-store" };

const STATUS_BY_REASON: Record<string, number> = {
  not_found: 404,
  invalid_code: 403,
  not_activated: 403,
  revoked: 403,
  expired: 403,
};

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const result = await fetchExam(slug, request.headers.get(LICENSE_HEADER), request.headers.get(DEVICE_HEADER));
    if (!result.ok) {
      return Response.json({ ok: false, reason: result.reason }, { status: STATUS_BY_REASON[result.reason] ?? 503, headers: NO_STORE });
    }
    return Response.json({ ok: true, ...result.exam }, { headers: NO_STORE });
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
