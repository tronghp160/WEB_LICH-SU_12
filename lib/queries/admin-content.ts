import "server-only";

import { z } from "zod";
import type { ContentKind } from "@/lib/admin/content-kinds";
import type { MediaStats, ReadinessSnapshot } from "@/lib/admin/readiness";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStatus } from "@/lib/utils/labels";
import { matchesTokens, toTokens } from "@/lib/utils/search";

// Mọi truy vấn ở đây chạy bằng PHIÊN CỦA NHÂN SỰ (không phải anon) nên RLS "staff_read_all"
// cho thấy cả bản nháp/chờ duyệt. Trang gọi phải đã qua requireRole().

/** `[id]` trên URL phải là UUID hợp lệ — nếu không PostgREST trả lỗi 22P02 thay vì "không tìm thấy". */
export function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`Không tải được ${what}: ${error.message}`);
}

export type ContentListItem = {
  id: string;
  title: string;
  slug: string;
  status: WorkflowStatus;
  reviewNote: string | null;
  /** Mô tả phụ dưới tên: mốc thời gian (sự kiện), số thứ tự (chủ đề)... */
  meta: string | null;
  /** Chỉ sự kiện có cột `updated_at`. */
  updatedAt: string | null;
};

export type ContentListFilters = { status?: WorkflowStatus | null; query?: string };

/**
 * Danh sách nội dung một loại (mọi trạng thái), lọc theo trạng thái và từ khóa (không dấu).
 * Số lượng nhỏ (vài chục) nên lọc từ khóa trong bộ nhớ.
 */
export async function listContent(kind: ContentKind, filters: ContentListFilters = {}): Promise<ContentListItem[]> {
  const supabase = await createClient();
  let items: ContentListItem[] = [];

  if (kind === "chu-de") {
    const { data, error } = await supabase
      .from("curriculum_topics")
      .select("id, name, slug, sort_order, workflow_status, review_note")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) fail("danh sách chủ đề", error);
    items = data.map((row) => ({
      id: row.id,
      title: row.name,
      slug: row.slug,
      status: row.workflow_status,
      reviewNote: row.review_note,
      meta: `Thứ tự ${row.sort_order}`,
      updatedAt: null,
    }));
  } else if (kind === "su-kien") {
    const { data, error } = await supabase
      .from("historical_events")
      .select("id, title, slug, date_text, workflow_status, review_note, updated_at")
      .order("updated_at", { ascending: false });
    if (error) fail("danh sách sự kiện", error);
    items = data.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.workflow_status,
      reviewNote: row.review_note,
      meta: row.date_text,
      updatedAt: row.updated_at,
    }));
  } else if (kind === "nhan-vat") {
    const { data, error } = await supabase
      .from("historical_figures")
      .select("id, name, slug, birth_year, death_year, workflow_status, review_note")
      .order("name", { ascending: true });
    if (error) fail("danh sách nhân vật", error);
    items = data.map((row) => ({
      id: row.id,
      title: row.name,
      slug: row.slug,
      status: row.workflow_status,
      reviewNote: row.review_note,
      meta: row.birth_year || row.death_year ? `${row.birth_year ?? "?"} – ${row.death_year ?? "?"}` : null,
      updatedAt: null,
    }));
  } else {
    const { data, error } = await supabase
      .from("historical_locations")
      .select("id, name, slug, latitude, workflow_status, review_note")
      .order("name", { ascending: true });
    if (error) fail("danh sách địa điểm", error);
    items = data.map((row) => ({
      id: row.id,
      title: row.name,
      slug: row.slug,
      status: row.workflow_status,
      reviewNote: row.review_note,
      meta: row.latitude === null ? "Chưa có tọa độ" : null,
      updatedAt: null,
    }));
  }

  const tokens = toTokens(filters.query ?? "");
  return items.filter(
    (item) =>
      (!filters.status || item.status === filters.status) &&
      (tokens.length === 0 || matchesTokens(item.title, tokens) || matchesTokens(item.slug.replaceAll("-", " "), tokens)),
  );
}

/** Số bản ghi theo trạng thái của một loại — dùng cho trang trung tâm "Nội dung". */
export async function countByStatus(kind: ContentKind): Promise<Record<WorkflowStatus, number>> {
  const items = await listContent(kind);
  const counts: Record<WorkflowStatus, number> = { draft: 0, pending_review: 0, needs_revision: 0, published: 0, hidden: 0 };
  for (const item of items) counts[item.status]++;
  return counts;
}

// ---------- Lấy một bản ghi để sửa ----------

export async function getTopicForEdit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curriculum_topics")
    .select("id, name, slug, description, sort_order, workflow_status, review_note")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("chủ đề", error);
  return data;
}

export async function getFigureForEdit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historical_figures")
    .select(`id, name, slug, other_names, birth_year, death_year, biography, portrait_url, workflow_status, review_note,
       media_assets(${ADMIN_MEDIA_FIELDS})`)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("nhân vật", error);
  return data;
}

/** Cột ảnh cần cho khu quản lý ảnh (MediaManager) ở trang sửa. */
const ADMIN_MEDIA_FIELDS =
  "id, file_url, media_type, caption, alt_text, source_id, sort_order, era, year_taken, photographer, license, license_url, source_page_url, is_reenactment, is_colorized, is_cover, focal_point" as const;

export async function getLocationForEdit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historical_locations")
    .select(
      `id, name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status, review_note,
       media_assets(${ADMIN_MEDIA_FIELDS})`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("địa điểm", error);
  return data;
}

export async function getSourceForEdit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("id, title, author_org, publisher, published_year, url, source_type, citation, accessed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("nguồn", error);
  return data;
}

export type EventEditData = NonNullable<Awaited<ReturnType<typeof getEventForEdit>>>;

/** Sự kiện + toàn bộ liên kết (nhân vật, địa điểm, nguồn) và media, để dựng form sửa. */
export async function getEventForEdit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historical_events")
    .select(
      `id, topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision,
       summary, content, is_featured, workflow_status, review_note,
       event_figures(figure_id, relationship, sort_order),
       event_locations(location_id, location_role, is_primary),
       event_sources(source_id, source_note, confidence_note),
       media_assets(${ADMIN_MEDIA_FIELDS})`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("sự kiện", error);
  return data;
}

// ---------- Danh sách lựa chọn cho form ----------

export type Option = { id: string; label: string; status?: WorkflowStatus };

export async function getFormOptions() {
  const supabase = await createClient();
  const [topics, figures, locations, sources] = await Promise.all([
    supabase.from("curriculum_topics").select("id, name, workflow_status").order("sort_order").order("name"),
    supabase.from("historical_figures").select("id, name, workflow_status").order("name"),
    supabase.from("historical_locations").select("id, name, workflow_status").order("name"),
    supabase.from("sources").select("id, title").order("title"),
  ]);
  if (topics.error) fail("danh sách chủ đề", topics.error);
  if (figures.error) fail("danh sách nhân vật", figures.error);
  if (locations.error) fail("danh sách địa điểm", locations.error);
  if (sources.error) fail("danh sách nguồn", sources.error);

  return {
    topics: topics.data.map((row): Option => ({ id: row.id, label: row.name, status: row.workflow_status })),
    figures: figures.data.map((row): Option => ({ id: row.id, label: row.name, status: row.workflow_status })),
    locations: locations.data.map((row): Option => ({ id: row.id, label: row.name, status: row.workflow_status })),
    sources: sources.data.map((row): Option => ({ id: row.id, label: row.title })),
  };
}

export type SourceListItem = {
  id: string;
  title: string;
  sourceType: string;
  citation: string;
  usedBy: number;
};

/** Danh sách nguồn kèm số sự kiện đang dùng (để cảnh báo trước khi xóa). */
export async function listSources(query = ""): Promise<SourceListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("id, title, source_type, citation, event_sources(count)")
    .order("title", { ascending: true });
  if (error) fail("danh sách nguồn", error);

  const tokens = toTokens(query);
  return data
    .map((row) => ({
      id: row.id,
      title: row.title,
      sourceType: row.source_type,
      citation: row.citation,
      usedBy: row.event_sources[0]?.count ?? 0,
    }))
    .filter((item) => tokens.length === 0 || matchesTokens(item.title, tokens) || matchesTokens(item.citation, tokens));
}

// ---------- Kiểm tra sẵn sàng gửi duyệt ----------

type MediaForReadiness = {
  caption: string | null;
  alt_text: string | null;
  license: string | null;
  photographer: string | null;
};

const isBlank = (text: string | null) => !text || text.trim() === "";

function mediaStats(media: MediaForReadiness[]): MediaStats {
  return {
    count: media.length,
    missingAlt: media.filter((item) => isBlank(item.alt_text)).length,
    missingLicense: media.filter((item) => isBlank(item.license)).length,
  };
}

/** Chữ của ảnh hiện ở trang công khai (chú thích, alt, tác giả, giấy phép). */
function mediaTexts(media: MediaForReadiness[]) {
  return media.flatMap((item) => [item.caption, item.alt_text, item.photographer, item.license]);
}

/**
 * Dựng ảnh chụp dữ liệu (mới nhất từ DB) để `evaluateReadiness` đánh giá; dùng cả khi dựng trang
 * (hiện checklist) lẫn trong Server Action gửi duyệt (không tin dữ liệu từ client).
 * Trả về null nếu bản ghi không tồn tại / không đọc được.
 */
export async function getReadinessSnapshot(
  kind: ContentKind,
  id: string,
): Promise<{ status: WorkflowStatus; snapshot: ReadinessSnapshot } | null> {
  if (kind === "chu-de") {
    const topic = await getTopicForEdit(id);
    return topic
      ? {
          status: topic.workflow_status,
          snapshot: { kind, description: topic.description, publicTexts: [topic.name, topic.description] },
        }
      : null;
  }

  if (kind === "nhan-vat") {
    const figure = await getFigureForEdit(id);
    return figure
      ? {
          status: figure.workflow_status,
          snapshot: {
            kind,
            biography: figure.biography,
            publicTexts: [figure.name, figure.other_names, figure.biography, ...mediaTexts(figure.media_assets)],
            media: mediaStats(figure.media_assets),
          },
        }
      : null;
  }

  if (kind === "dia-diem") {
    const location = await getLocationForEdit(id);
    return location
      ? {
          status: location.workflow_status,
          snapshot: {
            kind,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracyLevel: location.accuracy_level,
            description: location.description,
            publicTexts: [
              location.name,
              location.historical_name,
              location.description,
              location.accuracy_note,
              ...mediaTexts(location.media_assets),
            ],
            media: mediaStats(location.media_assets),
          },
        }
      : null;
  }

  const event = await getEventForEdit(id);
  if (!event) return null;

  // Trạng thái của nhân vật/địa điểm đã gắn: chưa published thì trang công khai sẽ ẩn chúng.
  const supabase = await createClient();
  const figureIds = event.event_figures.map((link) => link.figure_id);
  const locationIds = event.event_locations.map((link) => link.location_id);
  const [figures, locations] = await Promise.all([
    figureIds.length
      ? supabase.from("historical_figures").select("workflow_status").in("id", figureIds)
      : Promise.resolve({ data: [], error: null }),
    locationIds.length
      ? supabase.from("historical_locations").select("workflow_status").in("id", locationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (figures.error) fail("nhân vật liên kết", figures.error);
  if (locations.error) fail("địa điểm liên kết", locations.error);

  const unpublished = [...(figures.data ?? []), ...(locations.data ?? [])].filter(
    (row) => row.workflow_status !== "published",
  ).length;

  return {
    status: event.workflow_status,
    snapshot: {
      kind,
      content: event.content,
      sourceCount: event.event_sources.length,
      hasPrimaryLocation: event.event_locations.some((link) => link.is_primary),
      figureCount: event.event_figures.length,
      unpublishedLinkedCount: unpublished,
      publicTexts: [
        event.title,
        event.date_text,
        event.summary,
        event.content,
        ...event.event_figures.map((link) => link.relationship),
        ...event.event_locations.map((link) => link.location_role),
        ...event.event_sources.flatMap((link) => [link.source_note, link.confidence_note]),
        ...mediaTexts(event.media_assets),
      ],
      media: mediaStats(event.media_assets),
    },
  };
}

/**
 * Trạng thái của các sự kiện đang dùng một nguồn — qua nguồn tham khảo (event_sources) HOẶC nguồn của
 * ảnh (media_assets). Dùng để biết nguồn có bị khóa với biên tập viên không (isSourceLockedForEditor).
 */
export async function getSourceLinkedStatuses(sourceId: string): Promise<WorkflowStatus[]> {
  const supabase = await createClient();
  const [viaSources, viaMedia] = await Promise.all([
    supabase.from("event_sources").select("historical_events(workflow_status)").eq("source_id", sourceId),
    supabase.from("media_assets").select("historical_events(workflow_status)").eq("source_id", sourceId),
  ]);
  if (viaSources.error) fail("sự kiện dùng nguồn", viaSources.error);
  if (viaMedia.error) fail("ảnh dùng nguồn", viaMedia.error);

  return [...viaSources.data, ...viaMedia.data].flatMap((row) => {
    const event = row.historical_events as { workflow_status: WorkflowStatus } | null;
    return event ? [event.workflow_status] : [];
  });
}
