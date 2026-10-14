import type { Metadata } from "next";
import { OrderLookupForm } from "@/components/payments/OrderLookupForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { examPaths } from "@/lib/exams/exam";

export const metadata: Metadata = {
  title: "Tra cứu đơn hàng",
  description: "Tìm lại mã kích hoạt gói luyện thi bằng mã đơn và email đã dùng khi mua.",
  robots: { index: false, follow: true },
};

export default function OrderLookupPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Tra cứu đơn" }]} />
      <header className="mb-6 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Tra cứu đơn hàng</h1>
        <p className="mt-2 text-muted-foreground">
          Mất mã kích hoạt hoặc đã đổi máy? Nhập <strong>mã đơn</strong> (có trên trang kết quả thanh toán) và <strong>email</strong> em
          đã nhập lúc mua. Đơn không có email thì không tra cứu được — hãy liên hệ quản trị viên kèm mã đơn.
        </p>
      </header>
      <OrderLookupForm />
    </div>
  );
}
