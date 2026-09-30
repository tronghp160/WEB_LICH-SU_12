import sharp from "sharp";
import { pickCardCover, type CardMediaRow } from "@/lib/media";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_SHARE_IMAGE } from "@/lib/site";

// Ảnh chia sẻ (Open Graph) cho trang sự kiện / nhân vật / địa điểm: ảnh bìa cắt đúng 1200×630, JPEG
// (Zalo, Facebook, Messenger đọc JPEG ổn định hơn WebP). Chưa có ảnh bìa → chuyển sang ảnh mặc định.

const OWNER_TABLES = {
  "su-kien": "historical_events",
  "nhan-vat": "historical_figures",
  "dia-diem": "historical_locations",
} as const;

type Kind = keyof typeof OWNER_TABLES;

/** focal_point "50% 30%" → vị trí cắt của sharp: chỉ cần phân biệt trên/giữa/dưới vì khung 1200×630 là khung ngang. */
function cropPosition(focalPoint: string | null, portrait: boolean): string {
  const vertical = focalPoint ? Number(focalPoint.split(" ")[1]?.replace("%", "")) : NaN;
  if (Number.isFinite(vertical)) return vertical < 35 ? "top" : vertical > 65 ? "bottom" : "centre";
  // Chân dung dọc: ưu tiên phần trên (khuôn mặt).
  return portrait ? "top" : "centre";
}

export async function GET(request: Request, { params }: { params: Promise<{ loai: string; slug: string }> }) {
  const { loai, slug } = await params;
  const fallback = Response.redirect(new URL(DEFAULT_SHARE_IMAGE.url, request.url), 307);
  if (!Object.hasOwn(OWNER_TABLES, loai)) return fallback;

  try {
    const supabase = await createPublicClient();
    const { data } = await supabase
      .from(OWNER_TABLES[loai as Kind])
      .select("media_assets(file_url, alt_text, media_type, is_cover, focal_point, sort_order)")
      .eq("slug", slug)
      .eq("workflow_status", "published")
      .maybeSingle();
    const cover = data ? pickCardCover((data as { media_assets: CardMediaRow[] }).media_assets) : undefined;
    if (!cover) return fallback;

    // Ảnh tự lưu có sẵn cỡ 1200 (file_url trỏ tới bản -1200.webp); ảnh ngoài thì tải nguyên bản.
    const source = await fetch(cover.url, { signal: AbortSignal.timeout(8000) });
    if (!source.ok) return fallback;
    const input = Buffer.from(await source.arrayBuffer());
    const meta = await sharp(input).metadata();
    const portrait = (meta.height ?? 0) > (meta.width ?? 0);
    const jpeg = await sharp(input)
      .resize(1200, 630, { fit: "cover", position: cropPosition(cover.focalPoint, portrait) })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        // Ảnh bìa ít khi đổi: cho CDN giữ 1 ngày, dùng bản cũ thêm 1 tuần trong lúc làm mới.
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return fallback;
  }
}
