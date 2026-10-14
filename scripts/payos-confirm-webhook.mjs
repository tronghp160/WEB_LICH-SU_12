// Đăng ký URL webhook với payOS (docs/ke-hoach-thanh-toan.md, GĐ4). payOS gửi thử một giao dịch mẫu có chữ ký tới URL;
// web phải trả mã 2xx thì URL mới được nhận. URL phải công khai, HTTPS (bản deploy Vercel hoặc tunnel), KHÔNG dùng localhost.
//
// Cách chạy (khóa đọc từ .env.local, không in ra màn hình):
//   node --env-file=.env.local scripts/payos-confirm-webhook.mjs https://<ten-mien>/api/thanh-toan/webhook/payos

import { PayOS } from "@payos/node";

const url = process.argv[2];
if (!url || !/^https:\/\/[^/]+\/api\/thanh-toan\/webhook\/payos$/.test(url)) {
  console.error("Cần URL dạng https://<ten-mien>/api/thanh-toan/webhook/payos");
  process.exit(1);
}
const missing = ["PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY"].filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(`Thiếu biến môi trường: ${missing.join(", ")}`);
  process.exit(1);
}

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID.trim(),
  apiKey: process.env.PAYOS_API_KEY.trim(),
  checksumKey: process.env.PAYOS_CHECKSUM_KEY.trim(),
  logLevel: "off",
});

try {
  const result = await payos.webhooks.confirm(url);
  console.log(`Đã đăng ký webhook: ${result.webhookUrl}`);
  console.log(`Kênh: ${result.name} · tài khoản ${result.accountName} (${result.accountNumber})`);
} catch (error) {
  console.error(`payOS từ chối URL: ${error instanceof Error ? error.message : String(error)}`);
  console.error("Kiểm tra: web đã deploy đúng bản có route webhook, PAYMENT_PROVIDER=payos và 3 khóa payOS đã đặt trên máy chủ.");
  process.exit(1);
}
