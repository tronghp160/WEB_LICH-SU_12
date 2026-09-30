import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PresentationDeck } from "@/components/presentation/PresentationDeck";
import { getLesson, lessons } from "@/lib/lessons";

// Bài học viết cứng trong code → dựng sẵn lúc build; slug lạ trả 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({ params }: PageProps<"/bai-hoc/[slug]/trinh-chieu">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Không tìm thấy nội dung" };
  // Trang dành cho giáo viên chiếu trên lớp — nội dung trùng bài học nên không cần máy tìm kiếm lập chỉ mục.
  return { title: `Trình chiếu: ${lesson.title}`, description: `Chế độ trình chiếu bài học ${lesson.title} cho giáo viên.`, robots: { index: false } };
}

export default async function LessonPresentationPage({ params }: PageProps<"/bai-hoc/[slug]/trinh-chieu">) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();
  return <PresentationDeck lesson={lesson} />;
}
