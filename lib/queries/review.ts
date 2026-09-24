import "server-only";

import { CONTENT_KINDS, type ContentKind } from "@/lib/admin/content-kinds";
import { listContent, type ContentListItem } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStatus } from "@/lib/utils/labels";

/** Đường dẫn khu vực kiểm duyệt (dùng chung cho trang, action và menu). */
export const reviewPaths = {
  queue: "/quan-tri/kiem-duyet",
  item: (kind: ContentKind, id: string) => `/quan-tri/kiem-duyet/${kind}/${id}`,
};

/** Các tab của hàng đợi: chờ duyệt (mặc định), đã công bố, đã ẩn. */
export const REVIEW_TABS = ["pending_review", "published", "hidden"] as const satisfies readonly WorkflowStatus[];
export type ReviewTab = (typeof REVIEW_TABS)[number];

export function parseReviewTab(value: string | undefined): ReviewTab {
  return REVIEW_TABS.find((tab) => tab === value) ?? "pending_review";
}

export type ReviewItem = ContentListItem & { kind: ContentKind };

/**
 * Hàng đợi kiểm duyệt: nội dung của cả 4 loại, kèm số lượng theo tab.
 * Sắp xếp: mục có `updated_at` (chỉ sự kiện) theo thời gian tăng dần — gửi trước xử lý trước; các loại khác
 * (chưa có cột thời gian) xếp sau, theo loại rồi theo tên. Lọc theo loại/tab thực hiện trên kết quả đã lấy.
 */
export async function getReviewQueue(tab: ReviewTab, kind: ContentKind | null) {
  const all = (
    await Promise.all(
      CONTENT_KINDS.map(async (contentKind) =>
        (await listContent(contentKind)).map((item): ReviewItem => ({ ...item, kind: contentKind })),
      ),
    )
  ).flat();

  const counts: Record<ReviewTab, number> = { pending_review: 0, published: 0, hidden: 0 };
  for (const item of all) {
    if (item.status === "pending_review" || item.status === "published" || item.status === "hidden") counts[item.status]++;
  }

  const kindOrder = (item: ReviewItem) => CONTENT_KINDS.indexOf(item.kind);
  const items = all
    .filter((item) => item.status === tab && (kind === null || item.kind === kind))
    .sort((a, b) => {
      if (a.updatedAt && b.updatedAt) return a.updatedAt.localeCompare(b.updatedAt);
      if (a.updatedAt) return -1;
      if (b.updatedAt) return 1;
      return kindOrder(a) - kindOrder(b) || a.title.localeCompare(b.title, "vi");
    });

  return { items, counts };
}

/** Tổng số nội dung đang chờ duyệt (4 loại) — hiện ở sidebar. Chỉ đếm, không tải bản ghi. */
export async function getPendingReviewCount(): Promise<number> {
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("curriculum_topics").select("id", { count: "exact", head: true }).eq("workflow_status", "pending_review"),
    supabase.from("historical_events").select("id", { count: "exact", head: true }).eq("workflow_status", "pending_review"),
    supabase.from("historical_figures").select("id", { count: "exact", head: true }).eq("workflow_status", "pending_review"),
    supabase.from("historical_locations").select("id", { count: "exact", head: true }).eq("workflow_status", "pending_review"),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`Không đếm được nội dung chờ duyệt: ${failed.error.message}`);
  return results.reduce((sum, result) => sum + (result.count ?? 0), 0);
}
