import { getSearchIndex } from "@/lib/queries/search";
import type { QuickSearchIndex } from "@/lib/sgk/quick-search";
import { formatLifespan } from "@/lib/utils/text";

/**
 * Chỉ mục gọn cho lớp phủ tìm kiếm (components/layout/SearchOverlay): chỉ dữ liệu ĐÃ CÔNG BỐ (đọc bằng quyền khách),
 * mỗi bản ghi vài trường. Cho trình duyệt/CDN giữ 5 phút để mở lớp phủ nhiều lần không phải tải lại.
 */
export async function GET() {
  try {
    const index = await getSearchIndex();
    const body: QuickSearchIndex = {
      events: index.events.map((event) => ({ slug: event.slug, title: event.title, dateText: event.dateText })),
      figures: index.figures.map((figure) => ({
        slug: figure.slug,
        name: figure.name,
        otherNames: figure.otherNames,
        lifespan: formatLifespan(figure.birthYear, figure.deathYear),
      })),
      locations: index.locations.map((location) => ({ slug: location.slug, name: location.name, historicalName: location.historicalName })),
    };
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
  } catch {
    return Response.json({ error: "Không tải được dữ liệu tìm kiếm" }, { status: 503 });
  }
}
