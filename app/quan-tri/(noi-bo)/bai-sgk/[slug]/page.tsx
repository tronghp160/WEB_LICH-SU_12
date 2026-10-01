import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SgkAssignmentManager } from "@/components/admin/SgkAssignmentManager";
import { Callout } from "@/components/ui/Callout";
import { sgkAdminPath } from "@/lib/admin/routes";
import { requireRole } from "@/lib/auth";
import { listEventsForSgk, loadSgkAssignments } from "@/lib/queries/admin-sgk";
import { getSgkLesson, sgkPaths } from "@/lib/sgk/curriculum";

export async function generateMetadata({ params }: PageProps<"/quan-tri/bai-sgk/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getSgkLesson(slug);
  return { title: lesson ? `Bài SGK ${lesson.number}` : "Không tìm thấy" };
}

/** Gán sự kiện vào các mục của một Bài SGK (GĐ7). Kiểm duyệt viên chỉ xem. */
export default async function SgkLessonAdminPage({ params }: PageProps<"/quan-tri/bai-sgk/[slug]">) {
  const staff = await requireRole(["editor", "reviewer", "system_admin"]);
  const { slug } = await params;
  const lesson = getSgkLesson(slug);
  if (!lesson) notFound();

  const [data, events] = await Promise.all([loadSgkAssignments(lesson.slug), listEventsForSgk()]);

  return (
    <div>
      <p className="text-sm">
        <Link href={sgkAdminPath()} className="text-accent hover:underline">
          ← Bài SGK
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">
        Bài {lesson.number}. {lesson.title}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Chủ đề {lesson.topic.number}. {lesson.topic.shortTitle} ·{" "}
        <Link href={sgkPaths.lesson(lesson.slug)} className="text-accent hover:underline">
          Xem trang công khai
        </Link>
      </p>

      {!data.available ? (
        <Callout variant="warning" title="Chưa tạo bảng gán sự kiện" className="mt-6 max-w-3xl">
          Cần chạy migration <code>supabase/migrations/20261001000000_sgk_lesson_events.sql</code> và <code>supabase/seed-sgk.sql</code> trước khi gán.
        </Callout>
      ) : (
        <div className="mt-8">
          <SgkAssignmentManager
            lessonSlug={lesson.slug}
            sections={lesson.sections.map(({ id, numeral, title }) => ({ id, numeral, title }))}
            assignments={data.assignments}
            events={events}
            readOnly={staff.role === "reviewer"}
          />
        </div>
      )}
    </div>
  );
}
