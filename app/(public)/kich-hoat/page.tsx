import type { Metadata } from "next";
import Link from "next/link";
import { ActivateLicenseForm } from "@/components/payments/ActivateLicenseForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { examPaths } from "@/lib/exams/exam";

export const metadata: Metadata = {
  title: "Kích hoạt gói luyện thi",
  description: "Nhập mã LT12-XXXX-XXXX-XXXX để mở các đề luyện thi trên máy này.",
  robots: { index: false, follow: true },
};

export default function ActivatePage() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Kích hoạt" }]} />
      <header className="mb-6 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Kích hoạt gói luyện thi</h1>
        <p className="mt-2 text-muted-foreground">
          Nhập mã kích hoạt em nhận được sau khi thanh toán. Mỗi mã dùng được trên tối đa 3 thiết bị (máy tính, điện thoại…);
          kích hoạt lại trên cùng một máy không tốn thêm lượt.
        </p>
      </header>
      <div className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <ActivateLicenseForm />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Chưa có mã?{" "}
        <Link href={examPaths.hub} className="text-accent underline">
          Xem Gói luyện thi
        </Link>
      </p>
    </div>
  );
}
