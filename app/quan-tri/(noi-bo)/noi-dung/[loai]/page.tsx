import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentList } from "@/components/admin/ContentList";
import { Notice } from "@/components/admin/Notice";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { contentKindLabels, contentPaths, parseContentSegment } from "@/lib/admin/content-kinds";
import { requireRole } from "@/lib/auth";
import { listContent, listSources } from "@/lib/queries/admin-content";
import { normalizeQuery } from "@/lib/utils/search";
import { workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

type Props = {
  params: Promise<{ loai: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const segment = parseContentSegment((await params).loai);
  return { title: segment ? contentKindLabels[segment].plural : "Nội dung" };
}

function parseStatus(value: string | string[] | undefined): WorkflowStatus | null {
  return typeof value === "string" && Object.hasOwn(workflowStatusLabels, value) ? (value as WorkflowStatus) : null;
}

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

export default async function ContentListPage({ params, searchParams }: Props) {
  await requireRole(["editor", "system_admin"]);

  const segment = parseContentSegment((await params).loai);
  if (!segment) notFound();

  const query = await searchParams;
  const labels = contentKindLabels[segment];
  const status = parseStatus(query["trang-thai"]);
  const keyword = normalizeQuery(first(query.q));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb items={[{ label: "Nội dung", href: contentPaths.hub }, { label: labels.plural }]} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl font-bold text-foreground">{labels.plural}</h1>
          <LinkButton href={contentPaths.create(segment)}>{labels.newLabel}</LinkButton>
        </div>
      </div>

      <Notice code={first(query["thong-bao"])} />

      {segment === "nguon" ? (
        <SourceList keyword={keyword} />
      ) : (
        <ContentList
          kind={segment}
          items={await listContent(segment, { status, query: keyword })}
          filtered={status !== null || keyword !== ""}
          status={status}
          query={keyword}
          canCreate
        />
      )}
    </div>
  );
}

async function SourceList({ keyword }: { keyword: string }) {
  const sources = await listSources(keyword);

  return (
    <div className="flex flex-col gap-6">
      <form method="get" role="search" className="flex max-w-xl items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="loc-nguon" className="text-sm font-medium text-foreground">
            Tìm nguồn
          </label>
          <Input id="loc-nguon" name="q" defaultValue={keyword} maxLength={100} placeholder="Tên hoặc trích dẫn" />
        </div>
        <Button type="submit" variant="secondary">
          Tìm
        </Button>
      </form>

      {sources.length === 0 ? (
        <EmptyState
          title={keyword ? "Không có nguồn phù hợp" : "Chưa có nguồn nào"}
          description={keyword ? "Thử từ khóa khác." : "Bấm “Thêm nguồn” để tạo nguồn đầu tiên."}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sources.map((source) => (
            <li key={source.id} className="rounded-card border border-border bg-surface p-4">
              <Link
                href={contentPaths.edit("nguon", source.id)}
                className="font-serif text-lg font-semibold text-surface-foreground hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                {source.title}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{source.citation}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {source.usedBy > 0 ? `Đang dùng trong ${source.usedBy} sự kiện` : "Chưa được sự kiện nào dùng"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
