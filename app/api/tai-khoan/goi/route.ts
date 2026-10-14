import { unstable_rethrow } from "next/navigation";
import { getAccountLicenses, usableLicenses } from "@/lib/queries/account";
import { createClient } from "@/lib/supabase/server";

// Gói luyện thi còn dùng được của tài khoản đang đăng nhập — để trang /luyen-thi (trang tĩnh, client) hiện "Gói đã gắn
// với tài khoản" thay cho form mua. User id lấy từ phiên đã xác minh (getUser). Không lưu đệm.

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const { data } = await (await createClient()).auth.getUser();
    if (!data.user) return Response.json({ ok: false, reason: "unauthenticated" }, { status: 401, headers: NO_STORE });
    const packs = usableLicenses(await getAccountLicenses(data.user.id)).map(({ code, productSlug, productName, validUntil }) => ({
      code,
      productSlug,
      productName,
      validUntil,
    }));
    return Response.json({ ok: true, packs }, { headers: NO_STORE });
  } catch (error) {
    unstable_rethrow(error);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
