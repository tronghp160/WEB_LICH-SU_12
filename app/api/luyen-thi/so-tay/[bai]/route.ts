import { unstable_rethrow } from "next/navigation";
import { callerHasPack, failure, NO_STORE, readCaller } from "@/lib/exams/attempts-server";
import { FREE_HANDBOOK_LESSON } from "@/lib/exams/handbook";
import { loadHandbook } from "@/lib/queries/handbook";

// Sổ tay ôn thi một bài cho người có gói bằng MÃ trên máy (docs/ke-hoach-luyen-thi.md, mục 4.8 — GĐ8). Người có gói gắn
// tài khoản / bài xem thử được trang dựng sẵn phía server, không cần route này. Không lưu đệm (có "câu hay bị nhầm").

export async function GET(request: Request, { params }: { params: Promise<{ bai: string }> }) {
  const { bai } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(bai)) return failure("not_found");
  try {
    if (bai !== FREE_HANDBOOK_LESSON && !(await callerHasPack(await readCaller(request)))) return failure("pack_required");
    const handbook = await loadHandbook(bai);
    return handbook ? Response.json({ ok: true, handbook }, { headers: NO_STORE }) : failure("not_found");
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
