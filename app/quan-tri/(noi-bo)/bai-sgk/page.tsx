import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/Callout";
import { sgkAdminPath } from "@/lib/admin/routes";
import { requireRole } from "@/lib/auth";
import { loadSgkAssignments } from "@/lib/queries/admin-sgk";
import { SGK_12, staticAssignments } from "@/lib/sgk/curriculum";

export const metadata: Metadata = { title: "Bài SGK" };

/** "Bài SGK" (GĐ7): 17 bài theo mục lục, số sự kiện đã gán vào mỗi bài; bấm một bài để gán/bỏ gán theo từng mục. */
export default async function SgkAdminPage() {
  await requireRole(["editor", "reviewer", "system_admin"]);
  const data = await loadSgkAssignments();
  const counts = new Map<string, number>();
  if (data.available) for (const item of data.assignments) counts.set(item.lessonSlug, (counts.get(item.lessonSlug) ?? 0) + 1);
  const usingCode = !data.available || data.assignments.length === 0;

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-foreground">Bài SGK</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Gán sự kiện vào từng bài và mục của SGK Lịch sử 12. Trang Bài, mục lục, dòng thời gian, bản đồ và trắc nghiệm theo bài đều dùng cách gán này.
      </p>

      {!data.available ? (
        <Callout variant="warning" title="Chưa tạo bảng gán sự kiện" className="mt-6 max-w-3xl">
          Cần chạy migration <code>supabase/migrations/20261001000000_sgk_lesson_events.sql</code> rồi dữ liệu ban đầu <code>supabase/seed-sgk.sql</code>{" "}
          (trong SQL Editor của Supabase). Trong lúc chờ, trang công khai dùng cách gán viết sẵn trong code ({staticAssignments().length} dòng).
        </Callout>
      ) : (
        usingCode && (
          <Callout variant="warning" title="Bảng gán sự kiện đang trống" className="mt-6 max-w-3xl">
            Trang công khai đang dùng cách gán viết sẵn trong code. Chạy <code>supabase/seed-sgk.sql</code> để nạp {staticAssignments().length} dòng ban đầu,
            hoặc gán trực tiếp trong từng bài.
          </Callout>
        )
      )}

      <div className="mt-8 flex flex-col gap-8">
        {SGK_12.map((topic) => (
          <section key={topic.slug} aria-labelledby={`qt-${topic.slug}`}>
            <h2 id={`qt-${topic.slug}`} className="mb-3 font-serif text-xl font-bold text-foreground">
              Chủ đề {topic.number}. {topic.shortTitle}
            </h2>
            <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
              {topic.lessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={sgkAdminPath(lesson.slug)}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
                  >
                    <span>
                      <span className="font-semibold">Bài {lesson.number}.</span> {lesson.title}
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {data.available ? `${counts.get(lesson.slug) ?? 0} sự kiện` : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
