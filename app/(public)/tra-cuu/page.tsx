import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/search/SearchView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSearchIndex } from "@/lib/queries/search";

export const metadata: Metadata = {
  title: "Tra cứu",
  description:
    "Tra cứu sự kiện, nhân vật và địa điểm trong Lịch sử Việt Nam lớp 12 — gõ có dấu hoặc không dấu đều được.",
};

async function SearchContent() {
  return <SearchView index={await getSearchIndex()} />;
}

function SearchSkeleton() {
  return (
    <div role="status" aria-label="Đang tải dữ liệu tra cứu" className="flex flex-col gap-4">
      <Skeleton className="h-14 rounded-full" />
      <Skeleton className="h-9 w-2/3" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-32 rounded-card" />
      ))}
    </div>
  );
}

/** Tra cứu và lọc (UC04). Tiêu đề hiện ngay; dữ liệu được stream vào sau. */
export default function SearchPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tra cứu" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Tra cứu</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Tìm sự kiện, nhân vật và địa điểm trong chương trình Lịch sử 12. Gõ có dấu hoặc không dấu
          đều được, ví dụ &ldquo;dien bien phu&rdquo;.
        </p>
      </header>
      <SectionErrorBoundary title="Không tải được dữ liệu tra cứu">
        <Suspense fallback={<SearchSkeleton />}>
          <SearchContent />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}
