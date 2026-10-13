import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { HeartHandshake, Quote } from "lucide-react";
import { DonationForm } from "@/components/payments/DonationForm";
import { TestModeNotice } from "@/components/payments/TestModeNotice";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Callout } from "@/components/ui/Callout";
import { readPaymentConfig } from "@/lib/payments/config";
import { DONATION_SLUG, getActiveProduct, getDonationWall, type WallEntry } from "@/lib/queries/payments";

export const metadata: Metadata = {
  title: "Ủng hộ dự án",
  description: "Ủng hộ tự nguyện để web học Lịch sử 12 tiếp tục miễn phí cho học sinh. Bức tường cảm ơn những người đã đồng hành.",
};

async function quietly<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    unstable_rethrow(error);
    return fallback;
  }
}

function formatMonth(iso: string | null): string {
  if (!iso) return "";
  const [year, month] = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).split("-");
  return `tháng ${Number(month)}/${year}`;
}

export default async function DonatePage() {
  const [product, wall] = await Promise.all([
    quietly(() => getActiveProduct(DONATION_SLUG), null),
    quietly<WallEntry[] | null>(() => getDonationWall(), null),
  ]);
  const config = readPaymentConfig();
  const canDonate = Boolean(product?.min_vnd && product.max_vnd && config.ok);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Ủng hộ dự án" }]} />
      <header className="mb-8 mt-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">Đồng hành</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-foreground sm:text-4xl">Ủng hộ dự án</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Web được làm để học sinh học Lịch sử 12 miễn phí: bài SGK, bản đồ, tư liệu 3D, trắc nghiệm. Khoản ủng hộ tự nguyện giúp
          trả chi phí máy chủ, bản quyền ảnh và thời gian biên soạn nội dung.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[minmax(0,24rem)_1fr]">
        <section aria-labelledby="ung-ho-form" className="flex flex-col gap-4 rounded-card border border-border-strong bg-surface-raised p-5 sm:p-6">
          {config.ok && config.env === "test" && <TestModeNotice />}
          <h2 id="ung-ho-form" className="flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
            <HeartHandshake className="h-5 w-5 text-accent" aria-hidden="true" />
            Gửi ủng hộ
          </h2>
          {canDonate && product?.min_vnd && product.max_vnd ? (
            <DonationForm productSlug={product.slug} minVnd={product.min_vnd} maxVnd={product.max_vnd} />
          ) : (
            <Callout variant="warning" title="Tạm ngưng nhận ủng hộ">
              Web hiện chưa nhận ủng hộ trực tuyến. Cảm ơn em đã quan tâm!
            </Callout>
          )}
        </section>

        <section aria-labelledby="buc-tuong" className="flex flex-col gap-4">
          <h2 id="buc-tuong" className="font-serif text-2xl font-semibold text-foreground">
            Bức tường cảm ơn
          </h2>
          <p className="text-sm text-muted-foreground">
            Chỉ hiện tên và lời nhắn của những người chọn hiện, sau khi được duyệt. Không hiện số tiền hay email.
          </p>
          {wall === null ? (
            <p className="text-muted-foreground">Chưa tải được bức tường. Em tải lại trang sau nhé.</p>
          ) : wall.length === 0 ? (
            <p className="rounded-card border border-dashed border-border p-6 text-center text-muted-foreground">
              Chưa có lời nhắn nào. Em có thể là người đầu tiên!
            </p>
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2" data-testid="donation-wall">
              {wall.map((entry, index) => (
                <li key={`${entry.paidAt}-${index}`} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
                  {entry.message && (
                    <p className="flex gap-2 text-foreground">
                      <Quote className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                      <span className="whitespace-pre-wrap break-words">{entry.message}</span>
                    </p>
                  )}
                  <p className="mt-auto text-sm">
                    <span className="font-semibold text-foreground">{entry.displayName}</span>
                    <span className="text-muted-foreground">
                      {entry.tier ? ` · ${entry.tier}` : ""} · {formatMonth(entry.paidAt)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
