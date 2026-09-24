"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contentPaths, parseContentSegment, type ContentKind } from "@/lib/admin/content-kinds";
import {
  REVIEW_TRANSITIONS,
  reviewNoteFor,
  revisionReasonSchema,
  staleMessage,
  type ReviewAction,
} from "@/lib/admin/review";
import { dbErrorState, readFormValues, type ActionState } from "@/lib/actions/state";
import { requireRole } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { isUuid } from "@/lib/queries/admin-content";
import { reviewPaths } from "@/lib/queries/review";
import { createClient } from "@/lib/supabase/server";
import type { DbErrorLike } from "@/lib/utils/db-errors";
import { workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

// Kiểm duyệt (UC10–UC12). Chạy bằng PHIÊN của người duyệt → RLS `reviewer_update_status` là chốt chặn cuối
// (reviewer chỉ đổi được trạng thái; không tạo/sửa nội dung). requireRole() chỉ để chặn sớm.

type Db = SupabaseClient<Database>;
type Patch = { workflow_status: WorkflowStatus; review_note?: string | null };
type UpdateResult = { data: { id: string }[] | null; error: DbErrorLike | null };

/** Cập nhật trạng thái theo loại nội dung, KÈM điều kiện trạng thái hiện tại để phát hiện xử lý đồng thời. */
function updateStatus(db: Db, kind: ContentKind, id: string, from: WorkflowStatus, patch: Patch): PromiseLike<UpdateResult> {
  switch (kind) {
    case "chu-de":
      return db.from("curriculum_topics").update(patch).eq("id", id).eq("workflow_status", from).select("id");
    case "su-kien":
      return db.from("historical_events").update(patch).eq("id", id).eq("workflow_status", from).select("id");
    case "nhan-vat":
      return db.from("historical_figures").update(patch).eq("id", id).eq("workflow_status", from).select("id");
    case "dia-diem":
      return db.from("historical_locations").update(patch).eq("id", id).eq("workflow_status", from).select("id");
  }
}

async function currentStatus(db: Db, kind: ContentKind, id: string): Promise<WorkflowStatus | null> {
  const query =
    kind === "chu-de"
      ? db.from("curriculum_topics")
      : kind === "su-kien"
        ? db.from("historical_events")
        : kind === "nhan-vat"
          ? db.from("historical_figures")
          : db.from("historical_locations");
  const { data } = await query.select("workflow_status").eq("id", id).maybeSingle();
  return data?.workflow_status ?? null;
}

const NOTICE: Record<ReviewAction, string> = {
  request_revision: "da-tra-sua",
  publish: "da-cong-bo",
  hide: "da-an",
  republish: "da-cong-bo-lai",
};

async function runReview(action: ReviewAction, formData: FormData): Promise<ActionState> {
  await requireRole(["reviewer", "system_admin"]);
  const values = readFormValues(formData);

  const segment = parseContentSegment(values.kind ?? "");
  const id = values.id?.trim() ?? "";
  if (!segment || segment === "nguon" || !isUuid(id)) {
    return { status: "error", message: "Yêu cầu không hợp lệ.", values };
  }
  const kind: ContentKind = segment;

  // UC11: bắt buộc có lý do — kiểm tra Ở SERVER, không tin nút bị khóa ở giao diện.
  let reason: string | null = null;
  if (action === "request_revision") {
    const parsed = revisionReasonSchema.safeParse(values.reason);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Chưa thể trả sửa: cần nhập lý do.",
        fieldErrors: { reason: parsed.error.issues[0]?.message ?? "Vui lòng nhập lý do yêu cầu chỉnh sửa." },
        values,
      };
    }
    reason = parsed.data;
  }

  const { from, to } = REVIEW_TRANSITIONS[action];
  const supabase = await createClient();
  const { data, error } = await updateStatus(supabase, kind, id, from, {
    workflow_status: to,
    ...reviewNoteFor(action, reason),
  });

  // Ví dụ trigger G4: công bố sự kiện chưa có nguồn → thông báo tiếng Việt từ database.
  if (error) return dbErrorState(error, values);

  if (!data || data.length === 0) {
    const status = await currentStatus(supabase, kind, id);
    return {
      status: "error",
      message: staleMessage(status ? workflowStatusLabels[status] : null),
      stale: true,
      values,
    };
  }

  revalidatePath(reviewPaths.queue);
  revalidatePath(contentPaths.list(kind));
  redirect(`${reviewPaths.queue}?thong-bao=${NOTICE[action]}`);
}

export async function requestRevisionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return runReview("request_revision", formData);
}

export async function publishAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return runReview("publish", formData);
}

export async function hideAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return runReview("hide", formData);
}

export async function republishAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return runReview("republish", formData);
}
