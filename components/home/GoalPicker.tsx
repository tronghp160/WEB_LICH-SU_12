import Link from "next/link";
import { ArrowRight, BookOpen, Compass, ListChecks } from "lucide-react";
import { quizPaths } from "@/lib/quiz/sets";
import { sgkPaths } from "@/lib/sgk/curriculum";

const GOALS = [
  {
    href: sgkPaths.toc,
    icon: BookOpen,
    title: "Học bài",
    description: "Theo mục lục SGK: 6 chủ đề, 17 bài, mỗi bài chia theo mục như trong sách.",
    action: "Mở mục lục",
  },
  {
    href: quizPaths.hub,
    icon: ListChecks,
    title: "Ôn tập",
    description: "Trắc nghiệm có ảnh, chấm điểm ngay, đạt 7/10 được đóng dấu vào Hộ chiếu lịch sử.",
    action: "Làm trắc nghiệm",
  },
  {
    href: "/kham-pha",
    icon: Compass,
    title: "Khám phá",
    description: "Dòng thời gian, bản đồ lịch sử, di tích gần em, chuyên đề tương tác và tư liệu 3D.",
    action: "Xem các công cụ",
  },
];

/** "Em muốn làm gì hôm nay?" — ba việc chính thay cho ba thẻ lặp lại menu cũ (V-12). */
export function GoalPicker() {
  return (
    <section id="em-muon-lam-gi" aria-labelledby="goal-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-12 sm:px-6">
      <h2 id="goal-heading" className="mb-5 font-serif text-2xl font-bold text-foreground sm:text-[1.75rem]">
        Em muốn làm gì hôm nay?
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {GOALS.map(({ href, icon: Icon, title, description, action }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full flex-col rounded-card border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-gold-deep">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-serif text-xl font-bold text-foreground">{title}</span>
              <span className="mt-1 flex-1 text-[0.95rem] text-muted-foreground">{description}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground group-hover:text-accent">
                {action}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
