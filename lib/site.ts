/**
 * Địa chỉ gốc của web, dùng cho metadataBase, sitemap, robots. Ưu tiên NEXT_PUBLIC_SITE_URL (đặt khi có tên miền),
 * sau đó tên miền production Vercel tự cấp, cuối cùng là máy dev.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Ảnh chia sẻ mặc định (public/og-default.jpg, 1200×630). */
export const DEFAULT_SHARE_IMAGE = { url: "/og-default.jpg", width: 1200, height: 630, alt: "Lịch sử Việt Nam 12" } as const;

/** Ảnh chia sẻ của trang có ảnh bìa: JPEG 1200×630 tạo từ ảnh bìa (app/anh-chia-se/[loai]/[slug]/route.ts). */
export function shareImage(kind: "su-kien" | "nhan-vat" | "dia-diem", slug: string, alt: string, hasCover: boolean) {
  return hasCover ? { url: `/anh-chia-se/${kind}/${slug}`, width: 1200, height: 630, alt } : DEFAULT_SHARE_IMAGE;
}
