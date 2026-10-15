import { HandleReportsForm, RegradeForm } from "@/components/admin/exam-bank/QualityForms";
import { Badge } from "@/components/ui/Badge";
import { CHOICE_LETTERS, STATEMENT_LETTERS } from "@/lib/exams/items";
import { reportReasonLabels, reportStatusLabels, STATS_MIN_ATTEMPTS, statsFlagLabels, statsFlags, type ItemStats } from "@/lib/exams/quality";
import type { ReportGroup } from "@/lib/queries/exam-quality";

const percent = (value: number) => `${Math.round(value * 100)}%`;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
}

type Props = {
  itemId: string;
  kind: "mcq" | "true_false";
  correctIndex: number | null;
  stats: ItemStats | undefined;
  reports: ReportGroup["reports"];
  lastRegrade: { at: string; count: number } | null;
  canHandle: boolean;
  canRegrade: boolean;
};

/** Thống kê lượt thi, báo lỗi của học sinh, chấm lại (GĐ7 — docs/ke-hoach-luyen-thi.md, mục 3.9, 4.10). */
export function ItemQualityPanel({ itemId, kind, correctIndex, stats, reports, lastRegrade, canHandle, canRegrade }: Props) {
  const flags = statsFlags(stats, correctIndex);
  const open = reports.filter((report) => report.status === "open");
  return (
    <section aria-labelledby="chat-luong" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5" data-testid="item-quality">
      <h2 id="chat-luong" className="font-serif text-xl font-semibold text-foreground">
        Chất lượng câu
      </h2>

      <div className="flex flex-col gap-2 text-sm">
        <h3 className="font-semibold text-foreground">Thống kê lượt thi đã nộp</h3>
        {!stats ? (
          <p className="text-muted-foreground">Chưa có lượt thi nào có câu này.</p>
        ) : (
          <>
            <p className="text-foreground" data-testid="item-stats">
              {stats.n} lượt · tỉ lệ đạt {percent(stats.p)}
              {stats.n >= STATS_MIN_ATTEMPTS && <> · độ phân hóa {stats.disc.toFixed(2)}</>}
              {stats.n < STATS_MIN_ATTEMPTS && <span className="text-muted-foreground"> (dưới {STATS_MIN_ATTEMPTS} lượt — chưa đủ để kết luận)</span>}
            </p>
            {kind === "mcq" && stats.choices && (
              <p className="text-muted-foreground">
                Đã chọn (thứ tự gốc):{" "}
                {stats.choices.map((count, index) => `${CHOICE_LETTERS[index]}${index === correctIndex ? " (đáp án)" : ""}: ${count}`).join(" · ")}
                {stats.blank > 0 && ` · bỏ trống: ${stats.blank}`}
              </p>
            )}
            {kind === "true_false" && stats.statements && (
              <p className="text-muted-foreground">Tỉ lệ đúng từng ý: {stats.statements.map((value, index) => `${STATEMENT_LETTERS[index]}) ${percent(value)}`).join(" · ")}</p>
            )}
            {flags.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {flags.map((flag) => (
                  <Badge key={flag} variant="outline" className="border-warning text-foreground">
                    {statsFlagLabels[flag]}
                  </Badge>
                ))}
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <h3 className="font-semibold text-foreground">
          Báo lỗi của học sinh ({open.length} đang mở / {reports.length})
        </h3>
        {reports.length === 0 ? (
          <p className="text-muted-foreground">Chưa có báo lỗi.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0" data-testid="item-reports">
            {reports.slice(0, 20).map((report) => (
              <li key={report.id} className="rounded-lg border border-border p-2">
                <span className="font-medium text-foreground">{reportReasonLabels[report.reason]}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {formatTime(report.createdAt)} · {reportStatusLabels[report.status]}
                </span>
                {report.note && <span className="block whitespace-pre-line text-foreground">“{report.note}”</span>}
                {report.adminNote && <span className="block text-muted-foreground">Xử lý: {report.adminNote}</span>}
              </li>
            ))}
          </ul>
        )}
        {canHandle && open.length > 0 && <HandleReportsForm itemId={itemId} />}
      </div>

      {canRegrade && (
        <div className="flex flex-col gap-2 text-sm">
          <h3 className="font-semibold text-foreground">Chấm lại</h3>
          <p className="text-muted-foreground">
            Sau khi sửa đáp án (hoặc ý Đúng/Sai) của câu đã công bố, bấm để chấm lại câu này trong mọi lượt đã nộp. Chỉ điểm của câu này thay đổi; học
            sinh thấy ghi chú “Điểm đã được cập nhật do sửa đáp án” trên trang kết quả.
            {lastRegrade && ` Lần gần nhất: ${formatTime(lastRegrade.at)} (${lastRegrade.count} lượt đã đổi điểm tính đến nay).`}
          </p>
          <RegradeForm itemId={itemId} />
        </div>
      )}
    </section>
  );
}
