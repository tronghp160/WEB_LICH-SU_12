import { EVENT_CARD_MEDIA, toEventSummary, type EventSummary } from "@/lib/queries/events";
import { pickOnThisDay, vietnamToday, type OnThisDayResult } from "@/lib/utils/on-this-day";
import { createPublicClient } from "@/lib/supabase/public";

/** Một ảnh trong trình chiếu ở Hero trang chủ. */
export type HeroSlide = {
  slug: string;
  title: string;
  dateText: string;
  image: { url: string; alt: string; focalPoint: string | null };
};

/**
 * Các sự kiện có ảnh tư liệu nổi bật cho Hero, theo thứ tự trình chiếu. Sự kiện chưa công bố hoặc chưa có ảnh
 * thì bỏ qua (Hero tự hiện ít ảnh hơn hoặc nền chữ như cũ).
 */
const HERO_EVENT_SLUGS = [
  "chien-dich-dien-bien-phu",
  "tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi",
  "hiep-dinh-paris-ve-viet-nam",
  "chien-dich-ho-chi-minh",
] as const;

/** Ảnh riêng cho Hero khi ảnh bìa của sự kiện không hợp khung ngang (tên tệp trong bucket, không đổi dữ liệu). */
const HERO_IMAGE_OVERRIDES: Partial<Record<(typeof HERO_EVENT_SLUGS)[number], string>> = {
  // Ảnh bìa 19/8/1945 chỉ rộng 448 px, quá mờ khi phóng toàn màn hình → dùng ảnh mít tinh trước Nhà hát Lớn.
  "tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi": "mit-tinh-nha-hat-lon-1945",
};

type HeroRow = {
  slug: string;
  title: string;
  date_text: string;
  media_assets: { file_url: string; alt_text: string | null; is_cover: boolean; focal_point: string | null; media_type: string }[];
};

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("historical_events")
    .select("slug, title, date_text, media_assets(file_url, alt_text, is_cover, focal_point, media_type)")
    .eq("workflow_status", "published")
    .in("slug", [...HERO_EVENT_SLUGS]);
  if (error) throw new Error(`Không tải được ảnh trang chủ: ${error.message}`);

  const rows = data as HeroRow[];
  return HERO_EVENT_SLUGS.flatMap((slug) => {
    const row = rows.find((item) => item.slug === slug);
    if (!row) return [];
    const images = row.media_assets.filter((item) => item.media_type === "image");
    const override = HERO_IMAGE_OVERRIDES[slug];
    const image = (override && images.find((item) => item.file_url.includes(`/${override}-`))) ?? images.find((item) => item.is_cover);
    return image
      ? [{ slug, title: row.title, dateText: row.date_text, image: { url: image.file_url, alt: image.alt_text ?? "", focalPoint: image.focal_point } }]
      : [];
  });
}

export type OnThisDay = OnThisDayResult<EventSummary & { startDate: string }>;

/** Sự kiện đúng ngày hôm nay (giờ Việt Nam), hoặc ngày kỷ niệm gần nhất vừa qua/sắp tới. Chỉ xét sự kiện có ngày chính xác. */
export async function getOnThisDay(now = new Date()): Promise<OnThisDay | null> {
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("historical_events")
    .select(
      `slug, title, summary, date_text, date_precision, is_featured, start_year, start_date, curriculum_topics(name, slug), ${EVENT_CARD_MEDIA}`,
    )
    .eq("workflow_status", "published")
    .eq("date_precision", "exact")
    .not("start_date", "is", null);
  if (error) throw new Error(`Không tải được "Hôm nay trong lịch sử": ${error.message}`);

  const items = data.map((row) => ({ ...toEventSummary(row), startDate: row.start_date as string }));
  return pickOnThisDay(items, vietnamToday(now));
}
