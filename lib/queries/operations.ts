import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { contentPaths } from "@/lib/admin/content-kinds";
import { classifyDatabaseLatency, summarizeReport, type CheckResult, type DatabaseHealth, type OverallStatus } from "@/lib/admin/operations";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStatus } from "@/lib/utils/labels";

/** Một bản ghi vi phạm kiểm tra toàn vẹn, kèm liên kết tới trang sửa. */
export type IntegrityIssue = { title: string; href: string; detail?: string };

export type StatusCounts = Record<WorkflowStatus, number>;

export type OperationsReport = {
  /** ISO — thời điểm chạy báo cáo này. */
  checkedAt: string;
  database: DatabaseHealth;
  counts: CheckResult<{ label: string; counts: StatusCounts }[]>;
  staff: CheckResult<{ active: number; locked: number; byRole: Record<string, number> }>;
  integrity: {
    publishedEventsWithoutSource: CheckResult<IntegrityIssue[]>;
    publishedEventsWithoutPrimaryLocation: CheckResult<IntegrityIssue[]>;
    publishedLocationsWithoutCoordinates: CheckResult<IntegrityIssue[]>;
    mediaWithoutAltText: CheckResult<IntegrityIssue[]>;
    mediaWithoutLicense: CheckResult<IntegrityIssue[]>;
    publishedEventsInUnpublishedTopic: CheckResult<IntegrityIssue[]>;
  };
  overall: OverallStatus;
  testReport: { available: boolean; modifiedAt: string | null };
};

const emptyCounts = (): StatusCounts => ({ draft: 0, pending_review: 0, needs_revision: 0, published: 0, hidden: 0 });

/** Kiểm tra thuần thông tin: coi là "không có vấn đề" khi chạy được, giữ nguyên lỗi khi không chạy được. */
function informational<T>(result: CheckResult<T>): CheckResult<never[]> {
  return result.status === "error" ? result : { status: "ok", data: [] };
}

/** Chạy một kiểm tra; lỗi thì trả "error" (không ném) để một phần hỏng không làm hỏng cả trang. */
async function guard<T>(run: () => Promise<T>): Promise<CheckResult<T>> {
  try {
    return { status: "ok", data: await run() };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Lỗi không xác định" };
  }
}

/**
 * Báo cáo vận hành (UC15) bằng PHIÊN của quản trị viên (RLS thấy mọi trạng thái). Trang gọi phải đã qua
 * requireRole(["system_admin"]). Nguyên tắc: không lấy được số liệu → "error"/"unknown", không kết luận bình thường.
 */
export async function getOperationsReport(): Promise<OperationsReport> {
  const supabase = await createClient();

  // Thời gian phản hồi của một truy vấn đơn giản.
  let database: DatabaseHealth;
  const started = Date.now();
  try {
    const { error } = await supabase.from("curriculum_topics").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw new Error(error.message);
    database = classifyDatabaseLatency(Date.now() - started);
  } catch (error) {
    database = { status: "error", message: error instanceof Error ? error.message : "Không kết nối được database" };
  }

  const countTable = async (label: string, table: "curriculum_topics" | "historical_events" | "historical_figures" | "historical_locations") => {
    const { data, error } = await supabase.from(table).select("workflow_status");
    if (error) throw new Error(`${label}: ${error.message}`);
    const counts = emptyCounts();
    for (const row of data) counts[row.workflow_status]++;
    return { label, counts };
  };

  const counts = await guard(() =>
    Promise.all([
      countTable("Chủ đề", "curriculum_topics"),
      countTable("Sự kiện", "historical_events"),
      countTable("Nhân vật", "historical_figures"),
      countTable("Địa điểm", "historical_locations"),
    ]),
  );

  const staff = await guard(async () => {
    const { data, error } = await supabase.from("staff_profiles").select("role, account_status");
    if (error) throw new Error(`Nhân sự: ${error.message}`);
    const byRole: Record<string, number> = {};
    let locked = 0;
    for (const row of data) {
      byRole[row.role] = (byRole[row.role] ?? 0) + 1;
      if (row.account_status === "locked") locked++;
    }
    return { active: data.length - locked, locked, byRole };
  });

  const eventHref = (id: string) => contentPaths.edit("su-kien", id);

  const publishedEventsWithoutSource = await guard(async () => {
    const { data, error } = await supabase
      .from("historical_events")
      .select("id, title, event_sources(source_id)")
      .eq("workflow_status", "published");
    if (error) throw new Error(error.message);
    return data.filter((event) => event.event_sources.length === 0).map((event) => ({ title: event.title, href: eventHref(event.id) }));
  });

  const publishedEventsWithoutPrimaryLocation = await guard(async () => {
    const { data, error } = await supabase
      .from("historical_events")
      .select("id, title, event_locations(is_primary)")
      .eq("workflow_status", "published");
    if (error) throw new Error(error.message);
    return data
      .filter((event) => !event.event_locations.some((link) => link.is_primary))
      .map((event) => ({ title: event.title, href: eventHref(event.id) }));
  });

  const publishedLocationsWithoutCoordinates = await guard(async () => {
    const { data, error } = await supabase
      .from("historical_locations")
      .select("id, name, latitude, longitude")
      .eq("workflow_status", "published");
    if (error) throw new Error(error.message);
    return data
      .filter((location) => location.latitude === null || location.longitude === null)
      .map((location) => ({ title: location.name, href: contentPaths.edit("dia-diem", location.id) }));
  });

  // Ảnh thuộc sự kiện, nhân vật hoặc địa điểm (migration 20260929000001): chỉ về đúng trang sửa của chủ ảnh.
  const mediaRows = await guard(async () => {
    const { data, error } = await supabase
      .from("media_assets")
      .select(
        "id, alt_text, license, event_id, figure_id, location_id, historical_events(title), historical_figures(name), historical_locations(name)",
      );
    if (error) throw new Error(error.message);
    return data.map((item) => {
      const event = item.historical_events as { title: string } | null;
      const figure = item.historical_figures as { name: string } | null;
      const location = item.historical_locations as { name: string } | null;
      const owner = item.event_id
        ? { title: event?.title, href: eventHref(item.event_id) }
        : item.figure_id
          ? { title: figure?.name, href: contentPaths.edit("nhan-vat", item.figure_id) }
          : { title: location?.name, href: item.location_id ? contentPaths.edit("dia-diem", item.location_id) : contentPaths.hub };
      return { ...item, ownerTitle: owner.title ?? "(nội dung không xác định)", ownerHref: owner.href };
    });
  });
  const blank = (text: string | null) => !text || text.trim() === "";
  const mediaIssues = (missing: (item: { alt_text: string | null; license: string | null }) => boolean, detail: string) =>
    mediaRows.status === "ok"
      ? {
          status: "ok" as const,
          data: mediaRows.data.filter(missing).map((item) => ({ title: item.ownerTitle, href: item.ownerHref, detail })),
        }
      : mediaRows;
  const mediaWithoutAltText = mediaIssues((item) => blank(item.alt_text), "Ảnh thiếu chữ thay thế (alt)");
  const mediaWithoutLicense = mediaIssues((item) => blank(item.license), "Ảnh chưa ghi giấy phép");

  const publishedEventsInUnpublishedTopic = await guard(async () => {
    const { data, error } = await supabase
      .from("historical_events")
      .select("id, title, curriculum_topics(name, workflow_status)")
      .eq("workflow_status", "published");
    if (error) throw new Error(error.message);
    return data.flatMap((event) => {
      const topic = event.curriculum_topics as { name: string; workflow_status: WorkflowStatus } | null;
      return topic && topic.workflow_status !== "published"
        ? [{ title: event.title, href: eventHref(event.id), detail: `Chủ đề “${topic.name}” chưa được công bố` }]
        : [];
    });
  });

  // Báo cáo kiểm thử gần nhất (Phase 13). Có thể không nằm trong bản triển khai → coi là "chưa có", không phải lỗi.
  let testReport: OperationsReport["testReport"] = { available: false, modifiedAt: null };
  try {
    const stat = await fs.stat(path.join(process.cwd(), "docs", "test-report.md"));
    testReport = { available: true, modifiedAt: stat.mtime.toISOString() };
  } catch {
    // chưa có file
  }

  const integrity = {
    publishedEventsWithoutSource,
    publishedEventsWithoutPrimaryLocation,
    publishedLocationsWithoutCoordinates,
    mediaWithoutAltText,
    mediaWithoutLicense,
    publishedEventsInUnpublishedTopic,
  };

  return {
    checkedAt: new Date().toISOString(),
    database,
    counts,
    staff,
    integrity,
    overall: summarizeReport({
      database,
      // Số liệu thống kê không phải "vấn đề" nhưng nếu KHÔNG lấy được thì vẫn không được kết luận bình thường.
      checks: [informational(counts), informational(staff), ...Object.values(integrity)],
    }),
    testReport,
  };
}
