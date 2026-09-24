import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CONTENT_KINDS, contentKindLabels, contentPaths } from "@/lib/admin/content-kinds";
import { requireRole } from "@/lib/auth";
import { countByStatus, listSources } from "@/lib/queries/admin-content";

export const metadata: Metadata = { title: "Nội dung" };

/** Trung tâm quản lý nội dung (UC07/UC08): mỗi loại một thẻ kèm số bản ghi theo trạng thái. */
export default async function ContentHubPage() {
  await requireRole(["editor", "system_admin"]);

  const [counts, sources] = await Promise.all([
    Promise.all(CONTENT_KINDS.map((kind) => countByStatus(kind))),
    listSources(),
  ]);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-foreground">Nội dung</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Tạo và chỉnh sửa nội dung ở dạng bản nháp, gắn nguồn và ảnh, rồi gửi kiểm duyệt.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CONTENT_KINDS.map((kind, index) => {
          const c = counts[index];
          const total = Object.values(c).reduce((sum, n) => sum + n, 0);
          return (
            <li key={kind}>
              <Link
                href={contentPaths.list(kind)}
                className="group block h-full rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <Card className="flex h-full flex-col gap-2 p-5 transition-all group-hover:border-gold group-hover:shadow-lg">
                  <h2 className="font-serif text-xl font-semibold text-surface-foreground group-hover:text-accent">
                    {contentKindLabels[kind].plural}
                  </h2>
                  <p className="text-sm text-muted-foreground">{total} bản ghi</p>
                  <p className="text-xs text-muted-foreground">
                    Nháp {c.draft} · Chờ duyệt {c.pending_review} · Cần sửa {c.needs_revision} · Đã công bố {c.published}
                    {c.hidden > 0 ? ` · Ẩn ${c.hidden}` : ""}
                  </p>
                </Card>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href={contentPaths.list("nguon")}
            className="group block h-full rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <Card className="flex h-full flex-col gap-2 p-5 transition-all group-hover:border-gold group-hover:shadow-lg">
              <h2 className="font-serif text-xl font-semibold text-surface-foreground group-hover:text-accent">
                {contentKindLabels.nguon.plural}
              </h2>
              <p className="text-sm text-muted-foreground">{sources.length} nguồn</p>
              <p className="text-xs text-muted-foreground">Quản lý nguồn dùng chung cho các sự kiện và ảnh.</p>
            </Card>
          </Link>
        </li>
      </ul>
    </div>
  );
}
