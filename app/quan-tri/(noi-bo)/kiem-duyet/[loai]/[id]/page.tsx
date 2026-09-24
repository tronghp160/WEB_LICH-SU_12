import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewPanel } from "@/components/admin/review/ReviewPanel";
import { EventDetailView } from "@/components/content/detail/EventDetailView";
import { FigureDetailView } from "@/components/content/detail/FigureDetailView";
import { LocationDetailView } from "@/components/content/detail/LocationDetailView";
import { TopicDetailView } from "@/components/content/detail/TopicDetailView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { contentKindLabels, parseContentSegment } from "@/lib/admin/content-kinds";
import { REVIEW_CHECKLISTS, availableReviewActions } from "@/lib/admin/review";
import { requireRole } from "@/lib/auth";
import { isUuid } from "@/lib/queries/admin-content";
import { reviewPaths } from "@/lib/queries/review";
import { getReviewTarget } from "@/lib/queries/review-preview";

export const metadata: Metadata = { title: "Duyệt nội dung" };

type Props = { params: Promise<{ loai: string; id: string }> };

/**
 * Màn hình duyệt (UC10–UC12): trái = xem trước đúng giao diện trang công khai; phải = nguồn để đối chiếu,
 * checklist và các nút hành động. Chỉ kiểm duyệt viên và quản trị viên vào được.
 */
export default async function ReviewItemPage({ params }: Props) {
  const staff = await requireRole(["reviewer", "system_admin"]);

  const { loai, id } = await params;
  const segment = parseContentSegment(loai);
  if (!segment || segment === "nguon" || !isUuid(id)) notFound();

  const target = await getReviewTarget(segment, id);
  if (!target) notFound();

  const actions = availableReviewActions(staff.role, target.status);
  const sources = target.detail.kind === "su-kien" ? target.detail.event.sources : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Kiểm duyệt", href: reviewPaths.queue },
            { label: contentKindLabels[segment].plural },
            { label: target.title },
          ]}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section
          aria-label="Xem trước nội dung (giao diện như trang công khai)"
          className="min-w-0 rounded-card border border-border bg-background p-4 sm:p-6"
        >
          <p className="mb-5 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Xem trước — đúng như người đọc sẽ thấy sau khi công bố. Liên kết tới nội dung chưa công bố sẽ báo “không tìm thấy” ở trang công khai.
          </p>
          {target.detail.kind === "su-kien" && <EventDetailView event={target.detail.event} preview />}
          {target.detail.kind === "nhan-vat" && <FigureDetailView figure={target.detail.figure} preview />}
          {target.detail.kind === "dia-diem" && <LocationDetailView location={target.detail.location} preview />}
          {target.detail.kind === "chu-de" && (
            <TopicDetailView topic={target.detail.topic} events={target.detail.events} preview />
          )}
        </section>

        <aside aria-label="Đối chiếu và thao tác" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-card border border-border bg-surface p-5">
            <ReviewPanel
              kind={segment}
              id={id}
              status={target.status}
              actions={actions}
              reviewNote={target.reviewNote}
              checklist={REVIEW_CHECKLISTS[segment]}
              notes={target.notes}
              sources={sources}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
