import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { overallStatusLabels, type CheckResult, type OverallStatus } from "@/lib/admin/operations";
import { requireRole } from "@/lib/auth";
import { getOperationsReport, type IntegrityIssue } from "@/lib/queries/operations";
import { cn } from "@/lib/utils/cn";
import { staffRoleLabels, workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

export const metadata: Metadata = { title: "Vận hành" };

const STATUS_ORDER: WorkflowStatus[] = ["draft", "pending_review", "needs_revision", "published", "hidden"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "medium" });
}

/** Thông báo khi một phần số liệu không lấy được — KHÔNG được hiểu là "không có vấn đề". */
function CheckFailed({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-900 dark:text-orange-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold">Không kiểm tra được:</span> {message}. Chưa thể kết luận mục này bình thường.
      </span>
    </p>
  );
}

function IntegrityCheck({ title, description, result }: { title: string; description: string; result: CheckResult<IntegrityIssue[]> }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold text-surface-foreground">{title}</h3>
        {result.status === "ok" && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              result.data.length === 0 ? "bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-100" : "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
            )}
          >
            {result.data.length === 0 ? "Không có vấn đề" : `${result.data.length} vấn đề`}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {result.status === "error" && <CheckFailed message={result.message} />}
      {result.status === "ok" && result.data.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1.5 text-sm">
          {result.data.map((issue, index) => (
            <li key={`${issue.href}-${index}`}>
              <Link href={issue.href} className="font-medium text-accent hover:underline">
                {issue.title}
              </Link>
              {issue.detail && <span className="ml-2 text-muted-foreground">— {issue.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const overallStyles: Record<OverallStatus, { className: string; Icon: typeof CheckCircle2 }> = {
  ok: { className: "border-green-600/40 bg-green-600/10 text-green-900 dark:text-green-200", Icon: CheckCircle2 },
  issues: { className: "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200", Icon: AlertTriangle },
  unknown: { className: "border-orange-500/40 bg-orange-500/10 text-orange-900 dark:text-orange-200", Icon: HelpCircle },
};

/** Theo dõi vận hành (UC15): thống kê, kiểm tra toàn vẹn dữ liệu, kết nối database. Chỉ quản trị viên. */
export default async function OperationsPage() {
  await requireRole(["system_admin"]);
  const report = await getOperationsReport();
  const { className, Icon } = overallStyles[report.overall];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Vận hành</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Thống kê nội dung, kiểm tra toàn vẹn dữ liệu và tình trạng kết nối. Số liệu được tính lại mỗi lần mở trang.
        </p>
      </div>

      <div role="status" className={cn("flex max-w-3xl flex-col gap-1 rounded-card border px-4 py-3", className)}>
        <p className="flex items-center gap-2 font-semibold">
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          Tình trạng chung: {overallStatusLabels[report.overall]}
        </p>
        <p className="text-sm">
          Kiểm tra lúc {formatDateTime(report.checkedAt)} ·{" "}
          <Link href="/quan-tri/van-hanh" className="font-medium underline">
            Kiểm tra lại
          </Link>
        </p>
      </div>

      <section aria-labelledby="ket-noi-db" className="flex max-w-3xl flex-col gap-3">
        <h2 id="ket-noi-db" className="font-serif text-xl font-bold text-foreground">
          Kết nối database
        </h2>
        {report.database.status === "error" ? (
          <CheckFailed message={report.database.message} />
        ) : (
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 text-sm">
            <span>
              Thời gian phản hồi một truy vấn đơn giản: <strong>{report.database.ms} ms</strong>
            </span>
            <span className={report.database.status === "slow" ? "font-semibold text-accent" : "text-green-800 dark:text-green-300"}>
              {report.database.status === "slow" ? "Chậm (trên 1,5 giây)" : "Bình thường"}
            </span>
          </Card>
        )}
      </section>

      <section aria-labelledby="thong-ke" className="flex flex-col gap-3">
        <h2 id="thong-ke" className="font-serif text-xl font-bold text-foreground">
          Số bản ghi theo trạng thái
        </h2>
        {report.counts.status === "error" ? (
          <CheckFailed message={report.counts.message} />
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">Số bản ghi theo loại nội dung và trạng thái</caption>
              <thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">Loại</th>
                  {STATUS_ORDER.map((status) => (
                    <th key={status} scope="col" className="px-3 py-2 text-right font-semibold">
                      {workflowStatusLabels[status]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.counts.data.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-4 py-2 font-medium text-surface-foreground">{row.label}</th>
                    {STATUS_ORDER.map((status) => (
                      <td key={status} className="px-3 py-2 text-right tabular-nums">
                        {row.counts[status]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {report.staff.status === "error" ? (
          <CheckFailed message={report.staff.message} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nhân sự: {report.staff.data.active} đang hoạt động, {report.staff.data.locked} đã khóa (
            {Object.entries(report.staff.data.byRole)
              .map(([role, count]) => `${count} ${staffRoleLabels[role as keyof typeof staffRoleLabels] ?? role}`)
              .join(", ")}
            ).
          </p>
        )}
      </section>

      <section aria-labelledby="toan-ven" className="flex max-w-3xl flex-col gap-3">
        <h2 id="toan-ven" className="font-serif text-xl font-bold text-foreground">
          Kiểm tra toàn vẹn dữ liệu
        </h2>
        <IntegrityCheck
          title="Sự kiện đã công bố nhưng thiếu nguồn"
          description="Mọi sự kiện công bố phải có ít nhất 1 nguồn tham khảo."
          result={report.integrity.publishedEventsWithoutSource}
        />
        <IntegrityCheck
          title="Sự kiện đã công bố chưa có địa điểm chính"
          description="Không có địa điểm chính thì sự kiện không bay tới được vị trí trên bản đồ."
          result={report.integrity.publishedEventsWithoutPrimaryLocation}
        />
        <IntegrityCheck
          title="Địa điểm đã công bố thiếu tọa độ"
          description="Địa điểm không có tọa độ sẽ không hiện trên bản đồ."
          result={report.integrity.publishedLocationsWithoutCoordinates}
        />
        <IntegrityCheck
          title="Ảnh thiếu chữ thay thế (alt)"
          description="Ảnh không có chữ thay thế gây khó cho người dùng trình đọc màn hình."
          result={report.integrity.mediaWithoutAltText}
        />
        <IntegrityCheck
          title="Sự kiện đã công bố thuộc chủ đề chưa công bố"
          description="Chủ đề chưa công bố sẽ bị ẩn khỏi trang công khai nên sự kiện mất nhãn chủ đề."
          result={report.integrity.publishedEventsInUnpublishedTopic}
        />
      </section>

      <section aria-labelledby="bao-cao-kiem-thu" className="max-w-3xl">
        <h2 id="bao-cao-kiem-thu" className="mb-2 font-serif text-xl font-bold text-foreground">
          Kết quả kiểm thử gần nhất
        </h2>
        {report.testReport.available && report.testReport.modifiedAt ? (
          <p className="text-sm text-muted-foreground">
            Có báo cáo kiểm thử <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">docs/test-report.md</code>, cập nhật lần cuối {formatDateTime(report.testReport.modifiedAt)}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chưa có báo cáo kiểm thử (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">docs/test-report.md</code> sẽ được tạo ở Phase 13).
          </p>
        )}
      </section>
    </div>
  );
}
