import { NextResponse } from "next/server";
import { loginMethods } from "@/lib/auth/identities";
import { ACCOUNT_DATA_EXPORT, loginPath } from "@/lib/auth/routes";
import { getAccountLicenses } from "@/lib/queries/account";
import { siteUrl } from "@/lib/site";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// "Tải dữ liệu của em" (docs/ke-hoach-tai-khoan.md, mục 11): hồ sơ, tiến độ đã đồng bộ, đơn hàng và gói gắn tài khoản — dạng
// JSON. Hồ sơ / tiến độ đọc bằng phiên của chính người dùng (RLS own_select). Bảng orders đóng với authenticated nên đọc
// bằng khóa bí mật, lọc theo user id ĐÃ XÁC MINH và chỉ lấy cột không nhạy cảm (không token, không IP băm).

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.redirect(new URL(loginPath(ACCOUNT_DATA_EXPORT), siteUrl()), { headers: NO_STORE });

  const [profile, progress, orders, licenses] = await Promise.all([
    supabase.from("learner_profiles").select("display_name, school, avatar_url, terms_version, agreed_at, created_at, updated_at").eq("id", user.id).maybeSingle(),
    supabase.from("learner_progress").select("data, updated_at").eq("user_id", user.id).maybeSingle(),
    isAdminClientConfigured()
      ? createAdminClient()
          .from("orders")
          .select("order_code, product_id, amount_vnd, status, created_at, paid_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    getAccountLicenses(user.id).catch(() => null),
  ]);
  if (profile.error || progress.error || orders.error || !licenses) {
    return NextResponse.json({ error: "Chưa tải được dữ liệu. Em thử lại nhé." }, { status: 500, headers: NO_STORE });
  }

  const methods = loginMethods(user);
  const body = {
    xuat_luc: new Date().toISOString(),
    nguon: siteUrl(),
    tai_khoan: {
      email: user.email ?? null,
      tao_luc: user.created_at,
      dang_nhap_bang: [methods.password && "email + mật khẩu", methods.google && "Google"].filter(Boolean),
    },
    ho_so: profile.data,
    tien_do: progress.data,
    don_hang: orders.data ?? [],
    goi_luyen_thi: licenses.map(({ code, productName, status, validUntil }) => ({ ma: code, goi: productName, trang_thai: status, het_han: validUntil })),
  };

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      ...NO_STORE,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lich-su-12-du-lieu-${day}.json"`,
      "X-Robots-Tag": "noindex",
    },
  });
}
