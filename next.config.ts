import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Máy chủ Supabase (Auth, REST, Realtime) mà trình duyệt gọi thẳng. */
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

/**
 * Content-Security-Policy — đang ở chế độ **Report-Only** (chỉ báo vi phạm ở Console, không chặn) cho tới khi kiểm hết
 * mọi trang. Nguồn liệt kê từ mã thật:
 * - ảnh: Wikimedia Commons, Supabase Storage, ảnh đại diện Google (lh3.googleusercontent.com), YouTube / Sketchfab… — chủ
 *   bài có thể dán ảnh từ bất kỳ máy chủ https nào (SafeImage) nên `img-src` mở cho `https:`;
 * - bản đồ: ô ảnh OpenStreetMap (Leaflet → <img>), MapLibre tải bằng fetch (vệ tinh ArcGIS, độ cao AWS), worker ở
 *   /vendor/maplibre-gl/ (cùng nguồn);
 * - nhúng: video youtube-nocookie, mô hình Sketchfab;
 * - form gửi thẳng (trước khi JS chạy) có thể chuyển hướng sang Supabase → Google (đăng nhập) hoặc payOS (thanh toán).
 * `'unsafe-inline'` cho script: Next.js chèn script nội tuyến và script đặt giao diện sáng / tối ở đầu trang.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    supabaseOrigin,
    supabaseOrigin.replace(/^http/, "ws"),
    "https://tile.openstreetmap.org",
    "https://server.arcgisonline.com",
    "https://s3.amazonaws.com",
    isDev ? "ws:" : "",
  ]
    .filter(Boolean)
    .join(" "),
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "frame-src https://www.youtube-nocookie.com https://sketchfab.com",
  `form-action 'self' ${supabaseOrigin} https://accounts.google.com https://*.payos.vn`.replace(/\s+/g, " "),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Chống nhúng trang (clickjacking) — nhất là trang đăng nhập / thanh toán. Trình duyệt mới đọc `frame-ancestors` ở CSP.
  { key: "X-Frame-Options", value: "DENY" },
  // Trang "Gần em" dùng vị trí của chính trang → giữ `self`.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  // HSTS chỉ khi chạy production (localhost dùng http).
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
