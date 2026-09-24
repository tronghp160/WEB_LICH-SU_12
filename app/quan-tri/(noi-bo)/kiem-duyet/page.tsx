import type { Metadata } from "next";
import { Notice } from "@/components/admin/Notice";
import { ReviewQueue } from "@/components/admin/review/ReviewQueue";
import { CONTENT_KINDS, parseContentSegment, type ContentKind } from "@/lib/admin/content-kinds";
import { requireRole } from "@/lib/auth";
import { getReviewQueue, parseReviewTab } from "@/lib/queries/review";

export const metadata: Metadata = { title: "Kiểm duyệt" };

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** Hàng đợi kiểm duyệt (UC10): nội dung chờ duyệt của cả 4 loại, kèm tab "Đã công bố"/"Đã ẩn" để ẩn hoặc công bố lại (UC12). */
export default async function ReviewQueuePage({ searchParams }: Props) {
  await requireRole(["reviewer", "system_admin"]);

  const query = await searchParams;
  const tab = parseReviewTab(first(query.tab));
  const segment = parseContentSegment(first(query.loai) ?? "");
  const kind: ContentKind | null = segment && segment !== "nguon" && CONTENT_KINDS.includes(segment) ? segment : null;

  const { items, counts } = await getReviewQueue(tab, kind);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Kiểm duyệt</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Xem nội dung chờ duyệt, yêu cầu chỉnh sửa hoặc công bố. Nội dung đã công bố có thể ẩn, và nội dung bị ẩn có thể công bố lại.
        </p>
      </div>
      <Notice code={first(query["thong-bao"])} />
      <ReviewQueue items={items} counts={counts} tab={tab} kind={kind} />
    </div>
  );
}
