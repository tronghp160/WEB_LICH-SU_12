import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonView } from "@/components/lesson/LessonView";
import { getLesson, lessons } from "@/lib/lessons";

// Bài học viết cứng trong code → dựng sẵn lúc build; slug lạ trả 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({ params }: PageProps<"/bai-hoc/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Không tìm thấy nội dung" };
  const title = `Bài học tương tác: ${lesson.title}`;
  return { title, description: lesson.tagline, openGraph: { title, description: lesson.tagline, images: [lesson.hero.src] } };
}

export default async function LessonPage({ params }: PageProps<"/bai-hoc/[slug]">) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();
  return <LessonView lesson={lesson} />;
}
