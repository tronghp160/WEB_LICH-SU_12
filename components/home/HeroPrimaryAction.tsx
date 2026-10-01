"use client";

import { ArrowRight, List, PlayCircle } from "lucide-react";
import { continueTarget } from "@/components/layout/ContinueLearningLink";
import { LinkButton } from "@/components/ui/Button";
import { useProgress } from "@/lib/hooks/useProgress";
import { sgkLessons, sgkPaths } from "@/lib/sgk/curriculum";

/**
 * Nút chính của trang chủ: lần đầu là "Bắt đầu học Bài 1"; đã có tiến độ thì thành "Học tiếp Bài N". Lúc dựng ở server
 * (chưa đọc được trình duyệt) hiện "Bắt đầu học" — người đã học thấy nút đổi ngay sau khi trang chạy.
 */
export function HeroPrimaryAction() {
  const target = continueTarget(useProgress());
  const first = sgkLessons[0];

  return (
    <div id="hoc-tiep" className="mt-7 flex flex-wrap items-center gap-3">
      {target ? (
        <LinkButton href={target.href} size="lg">
          <PlayCircle className="h-5 w-5" aria-hidden="true" />
          Học tiếp Bài {target.lesson.number}
          {target.section && ` · Mục ${target.section.numeral}`}
        </LinkButton>
      ) : (
        <LinkButton href={sgkPaths.lesson(first.slug)} size="lg">
          Bắt đầu học Bài 1
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </LinkButton>
      )}
      <LinkButton href={sgkPaths.toc} variant="secondary" size="lg">
        <List className="h-5 w-5" aria-hidden="true" />
        Xem mục lục
      </LinkButton>
    </div>
  );
}
