import { unstable_rethrow } from "next/navigation";
import { getPaymentProvider } from "@/lib/payments/config";
import { processWebhook } from "@/lib/payments/orders";

// Webhook của cổng thanh toán (docs/ke-hoach-thanh-toan.md, mục 7.1). Chỉ nhận đúng cổng đang bật; chữ ký được kiểm
// trước khi đọc dữ liệu (lib/payments/orders.ts → provider.verifyWebhook). Không bao giờ ném lỗi ra ngoài: cổng chỉ
// cần biết đã nhận hay chưa để quyết định gửi lại.

export async function POST(request: Request, { params }: { params: Promise<{ cong: string }> }) {
  const { cong } = await params;
  const provider = getPaymentProvider();
  if (!provider || provider.name !== cong) {
    return Response.json({ ok: false, reason: "unknown_provider" }, { status: 404 });
  }
  try {
    const outcome = await processWebhook(provider, request);
    return provider.webhookResponse(outcome.ok, outcome.reason);
  } catch (error) {
    unstable_rethrow(error);
    // Lỗi tạm thời (mất kết nối DB…): trả 500 để cổng gửi lại sau.
    return Response.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
