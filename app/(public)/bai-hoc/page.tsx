import type { Metadata } from "next";
import { InteractiveEntryGrid } from "@/components/lesson/InteractiveEntryGrid";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { immersiveEntries, interactiveEntries } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "Bài học tương tác",
  description:
    "Học lịch sử bằng bản đồ diễn biến, ảnh tư liệu, video, phim 3D và bản đồ 3D — danh sách các bài học tương tác.",
};

/** Danh mục bài học tương tác (dữ liệu viết cứng trong lib/lessons nên trang dựng tĩnh). */
export default function LessonsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Bài học" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Bài học tương tác</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mỗi bài học kể lại một sự kiện bằng ảnh tư liệu, bản đồ diễn biến từng bước, video và thẻ ghi nhớ. Em có thể
          học theo thứ tự hoặc nhảy thẳng tới phần mình thích.
        </p>
      </header>

      <section aria-labelledby="danh-sach-bai-hoc">
        <h2 id="danh-sach-bai-hoc" className="sr-only">
          Danh sách bài học
        </h2>
        <InteractiveEntryGrid entries={interactiveEntries} />
      </section>

      <section aria-labelledby="trai-nghiem-3d" className="mt-12">
        <h2 id="trai-nghiem-3d" className="mb-2 font-serif text-2xl font-bold text-foreground">
          Trải nghiệm 3D
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Hình ảnh 3D được dựng bằng máy tính để minh họa, không phải phim hay ảnh tư liệu.
        </p>
        <InteractiveEntryGrid entries={immersiveEntries} actionLabel="Mở xem" />
      </section>
    </div>
  );
}
