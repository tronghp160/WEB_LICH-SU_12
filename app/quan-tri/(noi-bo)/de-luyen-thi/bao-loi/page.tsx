import type { Metadata } from "next";
import Link from "next/link";
import { HandleReportsForm } from "@/components/admin/exam-bank/QualityForms";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth";
import { examAdminPaths, examQualityPaths } from "@/lib/exams/admin";
import { examBankPaths, examItemKindLabels } from "@/lib/exams/items";
import { reportReasonLabels, reportStatusLabels } from "@/lib/exams/quality";
import { listReportGroups } from "@/lib/queries/exam-quality";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Báo lỗi câu hỏi" };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
}

/**
 * Hàng đợi báo lỗi câu hỏi (docs/ke-hoach-luyen-thi.md, mục 4.10 — GĐ7). Nhân sự xem; kiểm duyệt viên / quản trị viên
 * đánh dấu đã sửa / không phải lỗi. Sửa đáp án câu đã công bố + chấm lại: quản trị viên, ở trang câu hỏi.
 */
export default async function ExamReportsPage({ searchParams }: PageProps<"/quan-tri/de-luyen-thi/bao-loi">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const showAll = (await searchParams).xem === "tat-ca";
  const groups = await listReportGroups(showAll ? null : "open");
  const canHandle = staff.role === "reviewer" || staff.role === "system_admin";
  const tab = (active: boolean) =>
    cn("inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium", active ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-muted");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb items={[{ label: "Đề luyện thi", href: examAdminPaths.list }, { label: "Báo lỗi câu hỏi" }]} />
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">Báo lỗi câu hỏi</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Học sinh báo lỗi câu đã thấy đáp án (sau khi nộp bài / kiểm tra câu). Nếu đáp án sai: quản trị viên sửa câu rồi bấm “Chấm lại các lượt đã
          nộp” ở trang câu hỏi, sau đó đánh dấu “Đã sửa xong”.
        </p>
      </div>
      <nav aria-label="Lọc báo cáo" className="flex flex-wrap gap-2">
        <Link href={examQualityPaths.reports} className={tab(!showAll)} aria-current={!showAll ? "page" : undefined}>
          Đang mở
        </Link>
        <Link href={`${examQualityPaths.reports}?xem=tat-ca`} className={tab(showAll)} aria-current={showAll ? "page" : undefined}>
          Tất cả
        </Link>
      </nav>

      {groups.length === 0 ? (
        <EmptyState title={showAll ? "Chưa có báo lỗi nào" : "Không có báo lỗi đang mở"} description="Học sinh báo lỗi từ trang kết quả và phòng luyện tập." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0" data-testid="report-groups">
          {groups.map((group) => {
            const open = group.reports.filter((report) => report.status === "open").length;
            return (
              <li key={group.itemId} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
                <div className="flex flex-col gap-1">
                  <Link href={examBankPaths.edit(group.itemId)} className="font-medium text-foreground hover:text-accent hover:underline">
                    {group.stem.length > 200 ? `${group.stem.slice(0, 200)}…` : group.stem}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {examItemKindLabels[group.kind]} · {open} báo cáo đang mở / {group.reports.length}
                  </span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                  {group.reports.map((report) => (
                    <li key={report.id}>
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
                {canHandle && open > 0 && <HandleReportsForm itemId={group.itemId} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
