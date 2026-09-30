import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { quizPaths } from "@/lib/quiz/sets";

type QuizShellProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/** Khung chung của các trang trắc nghiệm: đường dẫn, tiêu đề, mô tả. */
export function QuizShell({ title, description, children }: QuizShellProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Trắc nghiệm", href: quizPaths.hub }, { label: title }]} />
      <header className="mb-6 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </header>
      {children}
    </div>
  );
}

/** Bộ câu hỏi chưa đủ câu để chơi. */
export function NotEnoughQuestions() {
  return (
    <EmptyState
      title="Bộ này chưa đủ câu hỏi"
      description="Nội dung của phần này đang được bổ sung. Em thử bộ trắc nghiệm tổng hợp nhé."
      action={<LinkButton href={quizPaths.all}>Làm trắc nghiệm tổng hợp</LinkButton>}
    />
  );
}
