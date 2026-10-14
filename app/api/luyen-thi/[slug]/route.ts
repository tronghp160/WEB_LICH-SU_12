import { unstable_rethrow } from "next/navigation";
import { DEVICE_HEADER, LICENSE_HEADER } from "@/lib/exams/exam";
import { fetchExam } from "@/lib/payments/licenses";
import { createClient } from "@/lib/supabase/server";

// Câu hỏi của một đề luyện thi (docs/ke-hoach-thanh-toan.md, mục 7.2). Mã kích hoạt + mã thiết bị đi trong header
// (không nằm trong URL). Đang đăng nhập thì gửi kèm user id lấy từ token đã xác minh (getClaims) — gói gắn với tài khoản
// mở đề mà không cần mã (docs/ke-hoach-tai-khoan.md, mục 7.2). Không bao giờ lưu đệm.

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
    const { data: auth } = await (await createClient()).auth.getClaims();
    const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
    const result = await fetchExam(slug, request.headers.get(LICENSE_HEADER), request.headers.get(DEVICE_HEADER), userId);
    if (!result.ok) {
      return Response.json({ ok: false, reason: result.reason }, { status: STATUS_BY_REASON[result.reason] ?? 503, headers: NO_STORE });
    }
    return Response.json({ ok: true, access: result.access, ...result.exam }, { headers: NO_STORE });
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
