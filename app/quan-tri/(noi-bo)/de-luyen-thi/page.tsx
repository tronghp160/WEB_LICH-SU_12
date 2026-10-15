import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { createExamSetAction } from "@/lib/actions/exams";
import { requireRole } from "@/lib/auth";
import { examAdminPaths, examQualityPaths } from "@/lib/exams/admin";
import { examFormatShortLabels, parseExamFormat, THPT_2025_LABEL } from "@/lib/exams/format";
import { examBankPaths } from "@/lib/exams/items";
import { listExamSetsForStaff } from "@/lib/queries/admin-exams";

export const metadata: Metadata = { title: "Đề luyện thi" };

/** Danh sách đề luyện thi cho nhân sự: biên tập viên soạn, kiểm duyệt viên duyệt (docs/ke-hoach-thanh-toan.md, mục 10). */
export default async function ExamSetsAdminPage({ searchParams }: PageProps<"/quan-tri/de-luyen-thi">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const params = await searchParams;
  const sets = await listExamSetsForStaff();
  const canCreate = staff.role === "editor" || staff.role === "system_admin";
  const pending = sets.filter((set) => set.status === "pending_review").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Đề luyện thi</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Đề bấm giờ cho Gói luyện thi THPT (đề thi thật: {THPT_2025_LABEL}). Câu hỏi chọn từ{" "}
            <Link href={examBankPaths.list} className="text-accent underline">
              Ngân hàng câu hỏi
            </Link>
            . Biên tập viên soạn và gửi duyệt; kiểm duyệt viên công bố. Đề trong gói chỉ làm được khi đã kích hoạt mã.
            {pending > 0 && <strong className="text-foreground"> {pending} đề đang chờ duyệt.</strong>}
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href={examQualityPaths.reports} className="text-accent underline">
              Báo lỗi câu hỏi
            </Link>
            {staff.role !== "editor" && (
              <Link href={examQualityPaths.stats} className="text-accent underline">
                Thống kê lượt làm bài
              </Link>
            )}
          </p>
        </div>
        {canCreate && (
          <form action={createExamSetAction}>
            <Button type="submit">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              Tạo đề mới
            </Button>
          </form>
        )}
      </div>
      {params.loi === "tao-de" && (
        <p role="alert" className="text-sm text-accent">
          Không tạo được đề mới. Thử lại sau.
        </p>
      )}
      {sets.length === 0 ? (
        <EmptyState title="Chưa có đề nào" description="Bấm “Tạo đề mới” để bắt đầu soạn." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {sets.map((set) => (
            <li key={set.slug}>
              <Link
                href={examAdminPaths.edit(set.slug)}
                className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 hover:border-accent sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="flex-1 font-medium text-foreground">{set.title}</span>
                <span className="text-sm text-muted-foreground">
                  {examFormatShortLabels[parseExamFormat(set.format)]} · {set.questionCount} câu · {set.durationMin} phút ·{" "}
                  {set.free ? "miễn phí" : "trong gói"}
                </span>
                <StatusBadge status={set.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
