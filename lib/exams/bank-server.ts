import "server-only";

import { balancedShift, letterCounts, sectionForKind } from "@/lib/exams/compose";
import type { ReadinessItem } from "@/lib/exams/admin";
import { createClient } from "@/lib/supabase/server";
import { translateDbError } from "@/lib/utils/db-errors";

// Phần dùng chung của các Server Action ngân hàng câu / soạn đề. KHÔNG đặt trong file "use server" (mọi hàm export ở đó
// đều thành endpoint gọi được từ trình duyệt). Chạy bằng phiên nhân sự → RLS quyết định quyền.

/**
 * Trước khi công bố câu: tư liệu của câu phải đã công bố; tư liệu đang chờ duyệt thì công bố cùng (người duyệt đã đọc
 * tư liệu khi duyệt câu). Trả true hoặc thông báo lỗi.
 */
export async function publishPassageOf(itemIds: string[]): Promise<true | string> {
  if (itemIds.length === 0) return true;
  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_items").select("passage_id, exam_passages(workflow_status)").in("id", itemIds).not("passage_id", "is", null);
  if (error) return translateDbError(error).message;
  const pending = new Set<string>();
  for (const row of data) {
    const status = row.exam_passages?.workflow_status;
    if (status === "pending_review" && row.passage_id) pending.add(row.passage_id);
    else if (status !== "published") return "Đoạn tư liệu của câu chưa gửi duyệt hoặc đang bị ẩn — xử lý tư liệu trước.";
  }
  if (pending.size > 0) {
    const { error: updateError } = await supabase
      .from("exam_passages")
      .update({ workflow_status: "published", review_note: null })
      .in("id", [...pending])
      .eq("workflow_status", "pending_review");
    if (updateError) return translateDbError(updateError).message;
  }
  return true;
}

export type SetItemRow = {
  itemId: string;
  section: number;
  position: number;
  shift: number;
  kind: "mcq" | "true_false";
  correctIndex: number | null;
  readiness: ReadinessItem;
};

/** Câu trong một đề theo thứ tự (Phần I rồi Phần II). */
export async function loadSetItems(setId: string): Promise<SetItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_set_items")
    .select("item_id, section, position, choice_shift, exam_items(kind, correct_index, explanation, source_note, workflow_status, level, event_id, passage_id)")
    .eq("set_id", setId)
    .order("section")
    .order("position");
  if (error) throw error;
  return data.flatMap((row) => {
    const item = row.exam_items;
    if (!item) return [];
    return [
      {
        itemId: row.item_id,
        section: row.section,
        position: row.position,
        shift: row.choice_shift,
        kind: item.kind,
        correctIndex: item.correct_index,
        readiness: {
          kind: item.kind,
          section: row.section,
          correct_index: item.correct_index,
          shift: row.choice_shift,
          explanation: item.explanation,
          source_note: item.source_note,
          status: item.workflow_status,
          level: item.level,
          event_id: item.event_id,
          hasPassage: item.passage_id !== null,
        },
      },
    ];
  });
}

/**
 * Thêm câu vào cuối phần tương ứng của đề, chọn độ xoay để rải đều đáp án. Trả thông báo lỗi hoặc null khi thành công.
 * Quyền: RLS exam_set_items (biên tập viên chỉ khi đề đang nháp / cần chỉnh sửa).
 */
export async function addItemToSet(slug: string, itemId: string): Promise<string | null> {
  const supabase = await createClient();
  const [{ data: set }, { data: item }] = await Promise.all([
    supabase.from("exam_sets").select("id").eq("slug", slug).maybeSingle(),
    supabase.from("exam_items").select("kind, correct_index, workflow_status").eq("id", itemId).maybeSingle(),
  ]);
  if (!set || !item) return "Không tìm thấy đề hoặc câu hỏi.";
  if (item.workflow_status === "hidden") return "Câu này đang bị ẩn.";
  const current = await loadSetItems(set.id);
  if (current.some((row) => row.itemId === itemId)) return "Câu này đã có trong đề.";
  const section = sectionForKind(item.kind);
  const position = Math.max(0, ...current.filter((row) => row.section === section).map((row) => row.position)) + 1;
  const shift = item.kind === "mcq" && item.correct_index !== null ? balancedShift(letterCounts(current), item.correct_index) : 0;
  const { data, error } = await supabase.from("exam_set_items").insert({ set_id: set.id, item_id: itemId, section, position, choice_shift: shift }).select("item_id");
  if (error) return translateDbError(error).message;
  if (!data || data.length === 0) return "Không thêm được (đề đã đổi trạng thái hoặc bạn không có quyền).";
  return null;
}
