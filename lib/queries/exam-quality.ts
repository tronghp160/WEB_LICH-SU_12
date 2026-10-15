import "server-only";

import { parseAdminOverview, parseItemStats, type AdminOverview, type ItemStats, type ReportReason, type ReportStatus } from "@/lib/exams/quality";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Chất lượng câu hỏi cho trang quản trị (GĐ7). Thống kê / tổng quan gọi hàm SQL bằng khóa bí mật — CHỈ gọi từ trang đã
// requireRole nhân sự (hàm không tự kiểm vai trò). Báo cáo đọc bằng phiên nhân sự (RLS staff_read).

/** Thống kê các câu (lượt thi đã nộp). Lỗi → Map rỗng (trang vẫn hiện, chỉ thiếu số liệu). */
export async function getItemStats(itemIds: readonly string[]): Promise<Map<string, ItemStats>> {
  if (itemIds.length === 0) return new Map();
  const { data, error } = await createAdminClient().rpc("exam_item_stats", { p_item_ids: [...itemIds] });
  return error ? new Map() : parseItemStats(data);
}

export async function getAdminOverview(days: number): Promise<AdminOverview | null> {
  const { data, error } = await createAdminClient().rpc("exam_admin_overview", { p_days: days });
  return error ? null : parseAdminOverview(data);
}

export type ReportGroup = {
  itemId: string;
  stem: string;
  kind: "mcq" | "true_false";
  itemStatus: string;
  reports: { id: string; reason: ReportReason; note: string | null; status: ReportStatus; adminNote: string | null; createdAt: string; handledAt: string | null }[];
};

/** Báo cáo theo câu (mới nhất trước). `status` null = mọi trạng thái. */
export async function listReportGroups(status: ReportStatus | null): Promise<ReportGroup[]> {
  const supabase = await createClient();
  let request = supabase
    .from("exam_item_reports")
    .select("id, item_id, reason, note, status, admin_note, created_at, handled_at, exam_items(stem, kind, workflow_status)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status) request = request.eq("status", status);
  const { data, error } = await request;
  if (error) throw error;
  const groups = new Map<string, ReportGroup>();
  for (const row of data) {
    const item = row.exam_items;
    if (!item) continue;
    const group = groups.get(row.item_id) ?? { itemId: row.item_id, stem: item.stem, kind: item.kind, itemStatus: item.workflow_status, reports: [] };
    group.reports.push({
      id: row.id,
      reason: row.reason,
      note: row.note,
      status: row.status as ReportStatus,
      adminNote: row.admin_note,
      createdAt: row.created_at,
      handledAt: row.handled_at,
    });
    groups.set(row.item_id, group);
  }
  return [...groups.values()];
}

/** Báo cáo của một câu (trang sửa câu). */
export async function listItemReports(itemId: string): Promise<ReportGroup["reports"]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_item_reports")
    .select("id, reason, note, status, admin_note, created_at, handled_at")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((row) => ({
    id: row.id,
    reason: row.reason,
    note: row.note,
    status: row.status as ReportStatus,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    handledAt: row.handled_at,
  }));
}

/** Lần chấm lại gần nhất của câu (để quản trị viên biết đã chấm chưa). */
export async function lastRegrade(itemId: string): Promise<{ at: string; count: number } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("exam_regrade_log").select("created_at").eq("item_id", itemId).order("created_at", { ascending: false }).limit(1000);
  if (!data || data.length === 0) return null;
  return { at: data[0].created_at, count: data.length };
}
