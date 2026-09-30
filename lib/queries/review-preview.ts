import "server-only";

import type { ContentKind } from "@/lib/admin/content-kinds";
import { evaluateReadiness, type ReadinessResult } from "@/lib/admin/readiness";
import { getReadinessSnapshot } from "@/lib/queries/admin-content";
import { loadEventDetail, type EventDetail } from "@/lib/queries/event-detail";
import { getTimelineEvents, type TimelineEvent } from "@/lib/queries/events";
import { loadFigureDetail, type FigureDetail } from "@/lib/queries/figures";
import { loadLocationDetail, type LocationDetail } from "@/lib/queries/locations";
import { loadTopicDetail, type TopicDetail } from "@/lib/queries/topics";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStatus } from "@/lib/utils/labels";

/** Dữ liệu để dựng màn hình duyệt một nội dung: bản xem trước + thông tin đối chiếu cho người duyệt. */
export type ReviewTarget = {
  kind: ContentKind;
  id: string;
  status: WorkflowStatus;
  title: string;
  reviewNote: string | null;
  /** Lưu ý cho người duyệt (không chặn): thiếu địa điểm chính, liên kết chưa công bố... */
  notes: string[];
  readiness: ReadinessResult;
  detail:
    | { kind: "su-kien"; event: EventDetail }
    | { kind: "nhan-vat"; figure: FigureDetail }
    | { kind: "dia-diem"; location: LocationDetail }
    | { kind: "chu-de"; topic: TopicDetail; events: TimelineEvent[] };
};

async function readReviewNote(kind: ContentKind, id: string): Promise<string | null> {
  const supabase = await createClient();
  const query =
    kind === "chu-de"
      ? supabase.from("curriculum_topics")
      : kind === "su-kien"
        ? supabase.from("historical_events")
        : kind === "nhan-vat"
          ? supabase.from("historical_figures")
          : supabase.from("historical_locations");
  const { data, error } = await query.select("review_note").eq("id", id).maybeSingle();
  if (error) throw new Error(`Không tải được ghi chú kiểm duyệt: ${error.message}`);
  return data?.review_note ?? null;
}

/**
 * Nạp nội dung cần duyệt bằng PHIÊN của nhân sự (RLS `staff_read_all` cho xem mọi trạng thái).
 * Trả về null nếu không tồn tại. Trang gọi phải đã qua requireRole(reviewer/admin).
 */
export async function getReviewTarget(kind: ContentKind, id: string): Promise<ReviewTarget | null> {
  const supabase = await createClient();
  const by = { id };

  let detail: ReviewTarget["detail"];
  let status: WorkflowStatus;
  let title: string;
  const notes: string[] = [];

  if (kind === "su-kien") {
    const event = await loadEventDetail(supabase, by, false);
    if (!event) return null;
    detail = { kind, event };
    status = event.status;
    title = event.title;

    // Liên kết chưa công bố sẽ KHÔNG hiện ở trang công khai (cảnh báo khi công bố — UC12).
    const hidden = [
      ...event.figures.filter((f) => f.status !== "published").map((f) => `nhân vật “${f.name}”`),
      ...event.locations.filter((l) => l.status !== "published").map((l) => `địa điểm “${l.name}”`),
    ];
    if (hidden.length > 0) {
      notes.push(
        `Chưa công bố: ${hidden.join(", ")}. Các mục này sẽ không hiện ở trang công khai cho tới khi được công bố.`,
      );
    }
  } else if (kind === "nhan-vat") {
    const figure = await loadFigureDetail(supabase, by, false);
    if (!figure) return null;
    detail = { kind, figure };
    status = figure.status;
    title = figure.name;
  } else if (kind === "dia-diem") {
    const location = await loadLocationDetail(supabase, by, false);
    if (!location) return null;
    detail = { kind, location };
    status = location.status;
    title = location.name;
  } else {
    const topic = await loadTopicDetail(supabase, by, false);
    if (!topic) return null;
    const events = (await getTimelineEvents()).filter((event) => event.topicSlugs.includes(topic.slug));
    detail = { kind, topic, events };
    status = topic.status;
    title = topic.name;
  }

  const [reviewNote, snapshot] = await Promise.all([readReviewNote(kind, id), getReadinessSnapshot(kind, id)]);
  const readiness = snapshot ? evaluateReadiness(snapshot.snapshot) : { blocking: [], warnings: [] };
  // Lưu ý "liên kết chưa công bố" ở trên đã nêu đích danh từng mục nên bỏ câu chung của readiness để khỏi trùng.
  const generic = /nhân vật\/địa điểm đã gắn chưa được công bố/;
  notes.push(...readiness.blocking, ...readiness.warnings.filter((warning) => !generic.test(warning)));

  return { kind, id, status, title, reviewNote, notes, readiness, detail };
}
