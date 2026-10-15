import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Callout } from "@/components/ui/Callout";
import { requireRole } from "@/lib/auth";
import { examAdminPaths, examQualityPaths } from "@/lib/exams/admin";
import { getAdminOverview } from "@/lib/queries/exam-quality";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Thống kê luyện thi" };

const PERIODS = [7, 30, 90] as const;

function formatDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

/**
 * Tổng quan quản trị luyện thi (docs/ke-hoach-luyen-thi.md, GĐ7): số lượt theo ngày, người dùng hoạt động, phân bố điểm.
 * Chỉ số đếm — không có thông tin cá nhân. Người dùng đếm theo tài khoản hoặc thiết bị (băm).
 */
export default async function ExamStatsPage({ searchParams }: PageProps<"/quan-tri/de-luyen-thi/thong-ke">) {
  await requireRole(["reviewer", "system_admin"]);
  const requested = Number((await searchParams).ngay);
  const days = PERIODS.find((value) => value === requested) ?? 30;
  const overview = await getAdminOverview(days);
  const tab = (active: boolean) =>
    cn("inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium", active ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-muted");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb items={[{ label: "Đề luyện thi", href: examAdminPaths.list }, { label: "Thống kê" }]} />
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">Thống kê luyện thi</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">Lượt làm bài và phân bố điểm. Không chứa thông tin cá nhân.</p>
      </div>
      <nav aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">
        {PERIODS.map((value) => (
          <Link key={value} href={`${examQualityPaths.stats}?ngay=${value}`} className={tab(value === days)} aria-current={value === days ? "page" : undefined}>
            {value} ngày
          </Link>
        ))}
      </nav>

      {!overview ? (
        <Callout variant="warning" title="Chưa tải được thống kê">
          Thử tải lại trang sau ít phút.
        </Callout>
      ) : (
        <>
          <section aria-label="Chỉ số chính" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-overview">
            {[
              ["Người dùng hoạt động 7 ngày", overview.active7],
              [`Người dùng hoạt động ${days} ngày`, overview.activePeriod],
              [`Tài khoản có làm bài (${days} ngày)`, overview.accountsPeriod],
              [`Lượt thi đã nộp (${days} ngày)`, overview.submittedExams],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-serif text-3xl font-bold text-foreground">{value}</span>
              </div>
            ))}
          </section>
          {overview.reportsOpen > 0 && (
            <p className="text-sm text-foreground">
              <Link href={examQualityPaths.reports} className="font-medium text-accent underline">
                {overview.reportsOpen} báo lỗi câu hỏi đang mở
              </Link>
            </p>
          )}

          <section aria-labelledby="pho-diem" className="flex flex-col gap-3">
            <h2 id="pho-diem" className="font-serif text-xl font-semibold text-foreground">
              Phân bố điểm lượt thi đã nộp
            </h2>
            <ScoreHistogram scores={overview.scores} />
          </section>

          <section aria-labelledby="theo-ngay" className="flex flex-col gap-3">
            <h2 id="theo-ngay" className="font-serif text-xl font-semibold text-foreground">
              Lượt làm bài theo ngày
            </h2>
            {overview.days.length === 0 ? (
              <p className="text-muted-foreground">Chưa có lượt nào trong khoảng này.</p>
            ) : (
              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full min-w-[24rem] text-sm">
                  <thead className="bg-muted text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Ngày</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Lượt thi</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Lượt luyện tập</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Đã nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...overview.days].reverse().map((row) => (
                      <tr key={row.day} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{formatDay(row.day)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{row.exam}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{row.practice}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{row.submitted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Cột ngang theo khoảng điểm — kèm số ở cuối mỗi cột (không dựa vào màu). */
function ScoreHistogram({ scores }: { scores: number[] }) {
  const max = Math.max(1, ...scores);
  return (
    <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Số lượt theo khoảng điểm">
      {scores.map((count, index) => (
        <li key={index} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {index}–{index === 9 ? "10" : `${index + 1}`} điểm
          </span>
          <span className="h-4 rounded-r bg-sunken">
            <span className="block h-4 rounded-r bg-accent" style={{ width: `${(count / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-foreground">{count}</span>
        </li>
      ))}
    </ol>
  );
}
