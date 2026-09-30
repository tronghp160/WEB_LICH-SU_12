import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminContentPanel } from "@/components/admin/AdminContentPanel";
import { DeleteSourceForm } from "@/components/admin/DeleteSourceForm";
import { EventForm } from "@/components/admin/forms/EventForm";
import { FigureForm } from "@/components/admin/forms/FigureForm";
import { LocationForm } from "@/components/admin/forms/LocationForm";
import { SourceForm } from "@/components/admin/forms/SourceForm";
import { TopicForm } from "@/components/admin/forms/TopicForm";
import { MediaManager } from "@/components/admin/MediaManager";
import { Notice } from "@/components/admin/Notice";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SubmitForReviewPanel } from "@/components/admin/SubmitForReviewPanel";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import {
  canEditContent,
  canSubmitForReview,
  contentKindLabels,
  isSourceLockedForEditor,
  contentPaths,
  parseContentSegment,
  type ContentKind,
} from "@/lib/admin/content-kinds";
import { evaluateReadiness } from "@/lib/admin/readiness";
import { requireRole, type Staff } from "@/lib/auth";
import {
  getEventForEdit,
  getFigureForEdit,
  getFormOptions,
  getLocationForEdit,
  getReadinessSnapshot,
  getSourceForEdit,
  getSourceLinkedStatuses,
  getTopicForEdit,
  isUuid,
  listSources,
} from "@/lib/queries/admin-content";
import { workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

type Props = {
  params: Promise<{ loai: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = { title: "Chỉnh sửa nội dung" };

export default async function EditContentPage({ params, searchParams }: Props) {
  const staff = await requireRole(["editor", "system_admin"]);

  const { loai, id } = await params;
  const segment = parseContentSegment(loai);
  if (!segment || !isUuid(id)) notFound();

  const query = await searchParams;
  const noticeCode = typeof query["thong-bao"] === "string" ? query["thong-bao"] : undefined;

  if (segment === "nguon") return <EditSource id={id} staff={staff} noticeCode={noticeCode} />;
  return <EditWorkflowContent kind={segment} id={id} staff={staff} noticeCode={noticeCode} />;
}

async function EditSource({ id, staff, noticeCode }: { id: string; staff: Staff; noticeCode?: string }) {
  const [source, sources, linkedStatuses] = await Promise.all([
    getSourceForEdit(id),
    listSources(),
    getSourceLinkedStatuses(id),
  ]);
  if (!source) notFound();
  const usedBy = sources.find((item) => item.id === id)?.usedBy ?? 0;
  // Biên tập viên không được sửa/xóa nguồn đang gắn với sự kiện đã gửi duyệt/công bố/ẩn (RLS ở bảng sources).
  const locked = staff.role === "editor" && isSourceLockedForEditor(linkedStatuses);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Nội dung", href: contentPaths.hub },
            { label: contentKindLabels.nguon.plural, href: contentPaths.list("nguon") },
            { label: source.title },
          ]}
        />
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">{source.title}</h1>
      </div>
      <Notice code={noticeCode} />
      {locked && (
        <p role="note" className="max-w-3xl rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
          Nguồn này đang được dùng trong sự kiện đã gửi duyệt, đã công bố hoặc đã ẩn nên bạn chỉ có thể xem. Nếu cần
          chỉnh sửa hoặc xóa, hãy liên hệ quản trị viên.
        </p>
      )}
      <SourceForm id={id} initial={source} readOnly={locked} />
      {!locked && (
        <div className="max-w-3xl">
          <DeleteSourceForm id={id} usedBy={usedBy} />
        </div>
      )}
    </div>
  );
}

/** Sửa chủ đề / sự kiện / nhân vật / địa điểm: form, ảnh, và khung gửi duyệt. */
async function EditWorkflowContent({
  kind,
  id,
  staff,
  noticeCode,
}: {
  kind: ContentKind;
  id: string;
  staff: Staff;
  noticeCode?: string;
}) {
  const record = await loadRecord(kind, id);
  if (!record) notFound();

  const { status, title, reviewNote } = record;
  const readOnly = !canEditContent(staff.role, status);
  const labels = contentKindLabels[kind];

  const readiness = await getReadinessSnapshot(kind, id);
  const checklist = readiness ? evaluateReadiness(readiness.snapshot) : { blocking: [], warnings: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Nội dung", href: contentPaths.hub },
            { label: labels.plural, href: contentPaths.list(kind) },
            { label: title },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-bold text-foreground">{title}</h1>
          <StatusBadge status={status} />
        </div>
      </div>

      <Notice code={noticeCode} />

      {status === "needs_revision" && reviewNote && (
        <div role="note" className="max-w-3xl rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-900 dark:text-orange-200">
          <p className="font-semibold">Kiểm duyệt viên yêu cầu chỉnh sửa:</p>
          <p className="mt-1 whitespace-pre-line">{reviewNote}</p>
        </div>
      )}

      {readOnly && (
        <p role="note" className="max-w-3xl rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
          Nội dung đang ở trạng thái “{workflowStatusLabels[status]}” nên bạn chỉ có thể xem, chưa thể chỉnh sửa.
          {status === "pending_review" && " Nội dung sẽ chỉnh sửa được lại nếu kiểm duyệt viên yêu cầu sửa."}
        </p>
      )}

      {record.form}

      {record.media && (
        <section aria-labelledby="anh-tu-lieu" className="flex max-w-3xl flex-col gap-4">
          <h2 id="anh-tu-lieu" className="font-serif text-xl font-bold text-foreground">
            Ảnh và tư liệu
          </h2>
          {record.media}
        </section>
      )}

      <div className="max-w-3xl">
        <SubmitForReviewPanel
          kind={kind}
          id={id}
          canSubmit={canSubmitForReview(staff.role, status)}
          blocking={checklist.blocking}
          warnings={checklist.warnings}
        />
      </div>

      {staff.role === "system_admin" && (
        <div className="max-w-3xl">
          <AdminContentPanel kind={kind} id={id} status={status} title={title} />
        </div>
      )}
    </div>
  );

  // (khai báo hàm cục bộ bên dưới để giữ phần dựng trang ở trên dễ đọc)
  async function loadRecord(
    recordKind: ContentKind,
    recordId: string,
  ): Promise<{
    status: WorkflowStatus;
    title: string;
    reviewNote: string | null;
    form: React.ReactNode;
    media?: React.ReactNode;
  } | null> {
    const isReadOnly = (current: WorkflowStatus) => !canEditContent(staff.role, current);

    if (recordKind === "chu-de") {
      const topic = await getTopicForEdit(recordId);
      if (!topic) return null;
      return {
        status: topic.workflow_status,
        title: topic.name,
        reviewNote: topic.review_note,
        form: <TopicForm id={recordId} initial={topic} readOnly={isReadOnly(topic.workflow_status)} />,
      };
    }

    if (recordKind === "nhan-vat") {
      const [figure, options] = await Promise.all([getFigureForEdit(recordId), getFormOptions()]);
      if (!figure) return null;
      return {
        status: figure.workflow_status,
        title: figure.name,
        reviewNote: figure.review_note,
        form: <FigureForm id={recordId} initial={figure} readOnly={isReadOnly(figure.workflow_status)} />,
        media: (
          <MediaManager
            owner={{ kind: "nhan-vat", id: recordId }}
            media={sortMedia(figure.media_assets)}
            sources={options.sources}
            readOnly={isReadOnly(figure.workflow_status)}
          />
        ),
      };
    }

    if (recordKind === "dia-diem") {
      const [location, options] = await Promise.all([getLocationForEdit(recordId), getFormOptions()]);
      if (!location) return null;
      return {
        status: location.workflow_status,
        title: location.name,
        reviewNote: location.review_note,
        form: <LocationForm id={recordId} initial={location} readOnly={isReadOnly(location.workflow_status)} />,
        media: (
          <MediaManager
            owner={{ kind: "dia-diem", id: recordId }}
            media={sortMedia(location.media_assets)}
            sources={options.sources}
            readOnly={isReadOnly(location.workflow_status)}
          />
        ),
      };
    }

    const [event, options] = await Promise.all([getEventForEdit(recordId), getFormOptions()]);
    if (!event) return null;
    const readOnlyEvent = isReadOnly(event.workflow_status);

    return {
      status: event.workflow_status,
      title: event.title,
      reviewNote: event.review_note,
      form: (
        <EventForm
          id={recordId}
          initial={{ ...event, is_featured: event.is_featured ?? false }}
          initialLinks={{
            figures: [...event.event_figures]
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((link) => ({ figure_id: link.figure_id, relationship: link.relationship ?? "" })),
            locations: event.event_locations.map((link) => ({
              location_id: link.location_id,
              location_role: link.location_role ?? "",
              is_primary: link.is_primary ?? false,
            })),
            sources: event.event_sources.map((link) => ({
              source_id: link.source_id,
              source_note: link.source_note ?? "",
              confidence_note: link.confidence_note ?? "",
            })),
            topics: event.event_topics.map((link) => link.topic_id),
          }}
          options={options}
          readOnly={readOnlyEvent}
        />
      ),
      media: (
        <MediaManager
          owner={{ kind: "su-kien", id: recordId }}
          media={sortMedia(event.media_assets)}
          sources={options.sources}
          readOnly={readOnlyEvent}
        />
      ),
    };
  }
}

/** Ảnh theo thứ tự hiển thị đã lưu. */
function sortMedia<T extends { sort_order: number | null }>(media: T[]): T[] {
  return [...media].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}
