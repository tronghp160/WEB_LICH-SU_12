import { unstable_rethrow } from "next/navigation";
import { attemptResponse, failure, getExamIntro, NO_STORE, readCaller } from "@/lib/exams/attempts-server";

// Trang đề trước khi làm (docs/ke-hoach-luyen-thi.md, GĐ2): quyền mở đề, số câu, lượt đang làm dở. KHÔNG trả câu hỏi
// — câu hỏi chỉ có khi bắt đầu lượt (POST …/bat-dau), đáp án chỉ có sau khi nộp. Mã kích hoạt + mã thiết bị đi trong
// header; đang đăng nhập thì gói của tài khoản mở đề không cần mã. Không bao giờ lưu đệm.

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return failure("not_found");
  try {
    const { data, error } = await getExamIntro(slug, await readCaller(request));
    return error ? Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE }) : attemptResponse(data);
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
