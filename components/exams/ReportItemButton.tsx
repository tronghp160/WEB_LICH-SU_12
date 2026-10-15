"use client";

import { MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { RoomDialog } from "@/components/exams/runner/RoomDialog";
import { Button } from "@/components/ui/Button";
import { attemptPaths } from "@/lib/exams/attempt";
import { DEVICE_HEADER } from "@/lib/exams/exam";
import { REPORT_NOTE_MAX, REPORT_REASONS, reportReasonLabels, type ReportReason } from "@/lib/exams/quality";
import { getDeviceId } from "@/lib/hooks/useLicense";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Em đã báo lỗi nhiều lần trong ít phút. Đợi một lúc rồi thử lại nhé.",
  not_found: "Không báo lỗi được câu này (chỉ báo được câu của bài em đã nộp / đã kiểm tra).",
  invalid: "Nội dung chưa hợp lệ — ghi chú tối đa 500 ký tự.",
};

/**
 * "Báo lỗi câu hỏi" (docs/ke-hoach-luyen-thi.md, mục 4.10 — GĐ7): chọn lý do + ghi chú → hàng đợi quản trị. Dùng ở trang
 * kết quả và phòng luyện tập (sau khi kiểm tra câu). Học sinh không thấy báo cáo của người khác.
 */
export function ReportItemButton({ attemptId, itemId, position }: { attemptId: string; itemId: string; position: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("sai_dap_an");
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function send() {
    setState({ kind: "sending" });
    try {
      const response = await fetch(attemptPaths.report, {
        method: "POST",
        headers: { [DEVICE_HEADER]: getDeviceId(), "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId, item_id: itemId, reason, note: note.trim() }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (body?.ok) setState({ kind: "sent" });
      else setState({ kind: "error", message: ERROR_MESSAGES[body?.reason ?? ""] ?? "Chưa gửi được. Em kiểm tra mạng rồi thử lại nhé." });
    } catch {
      setState({ kind: "error", message: "Chưa gửi được. Em kiểm tra mạng rồi thử lại nhé." });
    }
  }

  if (state.kind === "sent" && !open) {
    return (
      <span className="text-xs text-success" role="status">
        Đã gửi báo lỗi — cảm ơn em!
      </span>
    );
  }

  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)} className="self-start text-muted-foreground">
        <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
        Báo lỗi câu {position}
      </Button>
      <RoomDialog open={open} onClose={() => setOpen(false)} title={`Báo lỗi câu ${position}`}>
        {state.kind === "sent" ? (
          <>
            <p className="text-sm text-foreground" role="status">
              Đã gửi. Người soạn đề sẽ xem lại; nếu đáp án sai, điểm của em được chấm lại tự động.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Đóng</Button>
            </div>
          </>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-sm font-medium text-foreground">Lỗi gì?</legend>
              {REPORT_REASONS.map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="h-4 w-4 accent-[var(--accent)]" />
                  {reportReasonLabels[value]}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1 text-sm text-foreground">
              Ghi chú (không bắt buộc)
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={REPORT_NOTE_MAX}
                rows={3}
                className="rounded-lg border border-border bg-surface p-2 text-foreground"
                placeholder="Ví dụ: theo SGK Bài 7, mục 2 thì đáp án đúng là…"
              />
            </label>
            {state.kind === "error" && (
              <p role="alert" className="text-sm font-medium text-accent">
                {state.message}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={state.kind === "sending"}>
                {state.kind === "sending" ? "Đang gửi…" : "Gửi báo lỗi"}
              </Button>
            </div>
          </form>
        )}
      </RoomDialog>
    </>
  );
}
