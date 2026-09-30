import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/forms/EventForm";
import { FigureForm } from "@/components/admin/forms/FigureForm";
import { LocationForm } from "@/components/admin/forms/LocationForm";
import { SourceForm } from "@/components/admin/forms/SourceForm";
import { TopicForm } from "@/components/admin/forms/TopicForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { contentKindLabels, contentPaths, parseContentSegment } from "@/lib/admin/content-kinds";
import { requireRole } from "@/lib/auth";
import { getFormOptions } from "@/lib/queries/admin-content";

type Props = { params: Promise<{ loai: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const segment = parseContentSegment((await params).loai);
  return { title: segment ? contentKindLabels[segment].newLabel : "Thêm nội dung" };
}

/** Tạo mới: bản ghi luôn ở trạng thái `draft` (do server ép, không lấy từ form). */
export default async function NewContentPage({ params }: Props) {
  await requireRole(["editor", "system_admin"]);

  const segment = parseContentSegment((await params).loai);
  if (!segment) notFound();
  const labels = contentKindLabels[segment];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Nội dung", href: contentPaths.hub },
            { label: labels.plural, href: contentPaths.list(segment) },
            { label: labels.newLabel },
          ]}
        />
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">{labels.newLabel}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sau khi lưu, nội dung ở trạng thái “Bản nháp” — chưa hiển thị ra trang công khai.
        </p>
      </div>

      {segment === "chu-de" && <TopicForm initial={{ name: "", slug: "", description: null, sort_order: 0 }} />}

      {segment === "nhan-vat" && (
        <FigureForm
          initial={{ name: "", slug: "", other_names: null, birth_year: null, death_year: null, biography: null, portrait_url: null }}
        />
      )}

      {segment === "dia-diem" && (
        <LocationForm
          initial={{
            name: "",
            historical_name: null,
            slug: "",
            description: null,
            latitude: null,
            longitude: null,
            accuracy_level: "",
            accuracy_note: null,
          }}
        />
      )}

      {segment === "nguon" && (
        <SourceForm
          initial={{
            title: "",
            author_org: null,
            publisher: null,
            published_year: null,
            url: null,
            source_type: "",
            citation: "",
            accessed_at: null,
          }}
        />
      )}

      {segment === "su-kien" && <NewEventForm />}
    </div>
  );
}

async function NewEventForm() {
  const options = await getFormOptions();
  return (
    <EventForm
      initial={{
        topic_id: "",
        title: "",
        slug: "",
        start_year: null,
        end_year: null,
        start_date: null,
        end_date: null,
        date_text: "",
        date_precision: "",
        summary: "",
        content: null,
        is_featured: false,
      }}
      initialLinks={{ figures: [], locations: [], sources: [], topics: [] }}
      options={options}
    />
  );
}
