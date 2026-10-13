import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { BuyPackForm } from "@/components/payments/BuyPackForm";
import { TestModeNotice } from "@/components/payments/TestModeNotice";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Callout } from "@/components/ui/Callout";
import { readPaymentConfig } from "@/lib/payments/config";
import { formatVnd } from "@/lib/payments/pricing";
import { EXAM_PACK_SLUG, getActiveProduct } from "@/lib/queries/payments";

export const metadata: Metadata = {
  title: "Luyện thi tốt nghiệp THPT môn Lịch sử",
  description: "Gói 10 đề luyện 40 câu bấm giờ theo cấu trúc đề thi, có giải thích từng câu. Nội dung SGK trên web vẫn miễn phí.",
};

const BENEFITS = [
  "10 đề × 40 câu, bấm giờ 50 phút như phòng thi",
  "Giải thích từng câu, kèm liên kết về bài SGK để đọc lại",
  "Con dấu “Luyện thi” trong Hộ chiếu khi đạt từ 7 điểm",
];

async function loadProduct() {
  try {
    return await getActiveProduct(EXAM_PACK_SLUG);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

function formatDate(iso: string): string {
  const [year, month, day] = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).split("-");
  return `${day}/${month}/${year}`;
}

export default async function ExamPrepPage() {
  const product = await loadProduct();
  const config = readPaymentConfig();
  const canBuy = Boolean(product && product.price_vnd && config.ok);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT" }]} />
      <header className="mb-8 mt-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">Ôn tập</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-foreground sm:text-4xl">Luyện thi tốt nghiệp THPT – Lịch sử</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Toàn bộ 17 bài SGK, bản đồ, trắc nghiệm theo bài trên web vẫn <strong>miễn phí</strong>. Gói luyện thi là phần làm thêm cho
          các em muốn tập làm đề đúng cấu trúc trước kỳ thi.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,22rem)]">
        <section aria-labelledby="loi-ich" className="rounded-card border border-border bg-surface p-5 sm:p-6">
          <h2 id="loi-ich" className="font-serif text-xl font-semibold text-foreground">
            Gói gồm những gì?
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Mua xong em nhận <strong>mã kích hoạt</strong> dạng <code>LT12-XXXX-XXXX-XXXX</code>, nhập được trên tối đa{" "}
            {product?.max_devices ?? 3} thiết bị. Không cần tạo tài khoản.
          </p>
        </section>

        <section aria-labelledby="mua-goi" className="flex flex-col gap-4 rounded-card border border-border-strong bg-surface-raised p-5 sm:p-6">
          {config.ok && config.env === "test" && <TestModeNotice />}
          <h2 id="mua-goi" className="font-serif text-xl font-semibold text-foreground">
            Mua gói
          </h2>
          {product?.price_vnd ? (
            <p>
              <span className="text-3xl font-bold text-foreground">{formatVnd(product.price_vnd)}</span>
              {product.valid_until && <span className="text-sm text-muted-foreground"> · dùng đến {formatDate(product.valid_until)}</span>}
            </p>
          ) : null}
          {canBuy && product?.price_vnd ? (
            <BuyPackForm productSlug={product.slug} priceLabel={formatVnd(product.price_vnd)} />
          ) : (
            <Callout variant="warning" title="Tạm ngưng bán">
              Gói luyện thi hiện chưa mở bán. Em quay lại sau nhé.
            </Callout>
          )}
        </section>
      </div>
    </div>
  );
}
