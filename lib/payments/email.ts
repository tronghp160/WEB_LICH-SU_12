import "server-only";

import { after } from "next/server";
import { examPaths } from "@/lib/exams/exam";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";

// Gửi mã kích hoạt qua email sau khi đơn được thanh toán (T6 — docs/ke-hoach-tai-khoan.md, mục 3 và 9.3). Dùng API
// HTTP của Resend (cùng tài khoản với SMTP của Supabase Auth), khóa CHỈ ở server: RESEND_API_KEY, EMAIL_FROM.
// Chưa cấu hình → bỏ qua (người mua vẫn thấy mã ở trang kết quả / tra cứu đơn / tài khoản).
//
// Không cần cột "đã gửi": chỉ gọi khi mark_order_paid trả already=false — điều này xảy ra ĐÚNG MỘT LẦN cho mỗi đơn,
// dù webhook gửi lại bao nhiêu lần. Gửi trong after() (sau khi đã trả lời cổng / người dùng) và không bao giờ ném lỗi:
// email hỏng không được làm hỏng webhook. Không ghi email hay mã vào log.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function isLicenseEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Nội dung email (thuần — unit test được). */
export function licenseEmailContent(input: { orderCode: number; licenseCode: string; productName: string; site: string }) {
  const activate = `${input.site}${examPaths.activate}`;
  const lookup = `${input.site}/thanh-toan/tra-cuu`;
  const subject = `Mã kích hoạt ${input.productName} — đơn ${input.orderCode}`;
  const text = [
    "Cảm ơn em đã mua gói luyện thi của Lịch sử 12!",
    "",
    `Mã kích hoạt: ${input.licenseCode}`,
    `Mã đơn: ${input.orderCode}`,
    "",
    `Nhập mã ở trang Kích hoạt: ${activate}`,
    "Mỗi mã dùng được trên tối đa 3 thiết bị. Nếu em đăng nhập, có thể thêm mã vào tài khoản để mở đề trên mọi máy.",
    `Mất email này? Tra cứu lại bằng mã đơn + email: ${lookup}`,
  ].join("\n");
  const html = `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#1f1f1f;line-height:1.5">
<p>Cảm ơn em đã mua <strong>${escapeHtml(input.productName)}</strong> của Lịch sử 12!</p>
<p>Mã kích hoạt của em:</p>
<p style="font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:1px">${escapeHtml(input.licenseCode)}</p>
<p>Mã đơn: ${input.orderCode}</p>
<p><a href="${escapeHtml(activate)}">Kích hoạt trên máy này</a> — mỗi mã dùng được trên tối đa 3 thiết bị. Nếu em đăng nhập, có thể
thêm mã vào tài khoản để mở đề trên mọi máy.</p>
<p style="color:#666;font-size:13px">Mất email này? <a href="${escapeHtml(lookup)}">Tra cứu lại</a> bằng mã đơn và email.</p>
</body></html>`;
  return { subject, text, html };
}

async function sendLicenseEmail(orderCode: number): Promise<void> {
  const db = createAdminClient();
  const { data } = await db
    .from("orders")
    .select("order_code, buyer_email, status, products(name, kind), licenses(code)")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (!data || data.status !== "paid" || data.products.kind !== "exam_pack" || !data.buyer_email || !data.licenses?.code) return;

  const content = licenseEmailContent({ orderCode, licenseCode: data.licenses.code, productName: data.products.name, site: siteUrl() });
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [data.buyer_email], ...content }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) console.error(`[email] Gửi mã kích hoạt đơn ${orderCode} thất bại: HTTP ${response.status}`);
}

type PaidResult = { ok?: boolean; already?: boolean; kind?: string; license_code?: string | null } | null | undefined;

/** Hẹn gửi email mã kích hoạt nếu đơn VỪA được cấp mã (already=false). Gọi được ở route handler, Server Action, trang. */
export function scheduleLicenseEmail(orderCode: number, result: PaidResult): void {
  if (!result?.ok || result.already !== false || !result.license_code || !isLicenseEmailConfigured()) return;
  after(async () => {
    try {
      await sendLicenseEmail(orderCode);
    } catch {
      console.error(`[email] Gửi mã kích hoạt đơn ${orderCode} thất bại.`);
    }
  });
}
