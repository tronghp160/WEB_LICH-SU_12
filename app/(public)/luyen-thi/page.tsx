import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { ExamSetList, type ExamSetCard } from "@/components/exams/ExamSetList";
import { LicenseGate } from "@/components/exams/LicenseGate";
import { BuyPackForm } from "@/components/payments/BuyPackForm";
import { TestModeNotice } from "@/components/payments/TestModeNotice";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { hasAccountPack, loadGeneratorPool } from "@/lib/exams/attempts-server";
import { BLUEPRINTS } from "@/lib/exams/blueprint";
import { examPaths } from "@/lib/exams/exam";
import { canGenerate } from "@/lib/exams/generate";
import { THPT_2025_LABEL } from "@/lib/exams/format";
import { packBenefits, summarizeExamPack } from "@/lib/exams/pack";
import { contactEmail } from "@/lib/legal";
import { readPaymentConfig } from "@/lib/payments/config";
import { formatVnd } from "@/lib/payments/pricing";
import { getBankCounts, getPublishedExamSets } from "@/lib/queries/exams";
import { EXAM_PACK_SLUG, getActiveProduct } from "@/lib/queries/payments";
import { getCurriculum } from "@/lib/queries/sgk";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Luyện thi tốt nghiệp THPT môn Lịch sử",
  description: "Đề luyện thi tốt nghiệp THPT môn Lịch sử bấm giờ, có giải thích từng câu, kỹ năng làm câu Đúng/Sai và đọc tư liệu. Nội dung SGK trên web vẫn miễn phí.",
};

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    unstable_rethrow(error);
    return fallback;
  }
}

/** Có ma trận nào đủ câu cho ≥ 3 đề không trùng — chỉ khi đó mới nhắc tới đề tự sinh (mục 4.4). */
async function generatedReady(): Promise<boolean> {
  const pool = await loadGeneratorPool();
  return Boolean(pool && BLUEPRINTS.some((blueprint) => canGenerate(pool, blueprint)));
}

function formatDate(iso: string): string {
  const [year, month, day] = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Trang giới thiệu Gói luyện thi + danh sách đề (docs/ke-hoach-luyen-thi.md, mục 5 — GĐ8). Mọi con số dựng từ dữ liệu thật
 * (lib/exams/pack.ts). Người đã có gói gắn tài khoản được chuyển sang Tổng quan (?gioi-thieu=1 để xem lại trang này).
 */
export default async function ExamPrepPage({ searchParams }: PageProps<"/luyen-thi">) {
  const query = await searchParams;
  if (query["gioi-thieu"] !== "1") {
    const { data } = await (await createClient()).auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (userId && (await safe(() => hasAccountPack(userId), false))) redirect(examPaths.overview);
  }

  const [product, sets, generated, bank, curriculum] = await Promise.all([
    safe(() => getActiveProduct(EXAM_PACK_SLUG), null),
    safe<ExamSetCard[] | null>(() => getPublishedExamSets(), null),
    safe(generatedReady, false),
    safe(getBankCounts, { mcq: 0, trueFalse: 0 }),
    getCurriculum(),
  ]);
  const config = readPaymentConfig();
  // Chỉ bán khi đếm được và có ít nhất một đề trả phí đã công bố — không bán gói rỗng.
  const pack = sets ? summarizeExamPack(sets) : null;
  const canBuy = Boolean(product && product.price_vnd && config.ok && pack?.sellable);
  const fullSets = (sets ?? []).filter((set) => set.format === "thpt_2025" && (set.questionCount ?? 0) > 0).length;
  const benefits = packBenefits({
    fullSets,
    bankMcq: bank.mcq,
    bankTrueFalse: bank.trueFalse,
    generated,
    handbookLessons: curriculum.lessons.filter((lesson) => lesson.sections.some((section) => (section.eventSlugs ?? []).length > 0)).length,
  });
  const freeSet = (sets ?? []).find((set) => set.free && (set.questionCount ?? 0) > 0);
  const maxDevices = product?.max_devices ?? 3;
  const contact = contactEmail();

  const faq: { q: string; a: React.ReactNode }[] = [
    {
      q: "Một gói dùng được trên mấy máy?",
      a: (
        <>
          Mã kích hoạt nhập được trên tối đa {maxDevices} thiết bị. Nếu mua khi đang đăng nhập, gói gắn với tài khoản: đăng nhập ở máy nào cũng mở được đề.
        </>
      ),
    },
    {
      q: "Có cần tạo tài khoản không?",
      a: "Không bắt buộc: mua và làm đề chỉ cần mã kích hoạt. Sổ câu sai, tổng quan và lộ trình ôn cần đăng nhập để lưu theo em trên mọi máy.",
    },
    {
      q: "Đề có đúng cấu trúc thi từ năm 2025 không?",
      a:
        fullSets > 0
          ? `Có ${fullSets} đề đầy đủ đúng cấu trúc ${THPT_2025_LABEL}. Ngoài ra có đề ngắn và đề theo chủ đề để luyện nhanh.`
          : `Đề thi thật gồm ${THPT_2025_LABEL}. Các đề hiện có là đề mẫu ngắn; đề đầy đủ đang được biên soạn và sẽ tự mở cho người đã mua.`,
    },
    { q: "Mua rồi, đề mới có tự mở không?", a: `Có. Đề mới được công bố trong thời hạn của gói${product?.valid_until ? ` (đến ${formatDate(product.valid_until)})` : ""} tự mở cho người đã mua, không phải mua lại.` },
    {
      q: "Đã chuyển tiền mà chưa nhận được mã, hoặc cần hỗ trợ về đơn hàng?",
      a: (
        <>
          Em dùng trang{" "}
          <Link href="/thanh-toan/tra-cuu" className="text-accent underline">
            Tra cứu đơn
          </Link>{" "}
          (mã đơn + email){contact ? <> hoặc liên hệ {contact}</> : null} kèm mã đơn để được hỗ trợ. Điều kiện sử dụng xem ở{" "}
          <Link href="/dieu-khoan" className="text-accent underline">
            Điều khoản
          </Link>
          .
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT" }]} />
      <header className="mb-8 mt-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">Ôn tập</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-foreground sm:text-4xl">Luyện thi tốt nghiệp THPT – Lịch sử</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Toàn bộ 17 bài SGK, bản đồ, trắc nghiệm theo bài, kỹ năng làm bài trên web vẫn <strong>miễn phí</strong>. Gói luyện thi là phần làm thêm cho các em
          muốn tập làm đề bấm giờ trước kỳ thi.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground" data-testid="exam-format-note">
          Đề thi tốt nghiệp môn Lịch sử từ năm 2025 gồm {THPT_2025_LABEL}.{" "}
          {fullSets > 0
            ? `Hiện có ${fullSets} đề đầy đủ theo đúng cấu trúc này.`
            : "Các đề hiện có là đề mẫu ngắn, chỉ có câu trắc nghiệm; đề đầy đủ theo đúng cấu trúc này đang được biên soạn."}{" "}
          Nội dung hiện tập trung chương trình lớp 12.
        </p>
        {freeSet && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LinkButton href={examPaths.set(freeSet.slug)} size="lg" data-testid="free-trial">
              Làm thử đề miễn phí
            </LinkButton>
            <span className="text-sm text-muted-foreground">
              {freeSet.questionCount} câu · {freeSet.durationMin} phút · không cần mã
            </span>
          </div>
        )}
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,22rem)]">
        <section aria-labelledby="loi-ich" className="rounded-card border border-border bg-surface p-5 sm:p-6">
          <h2 id="loi-ich" className="font-serif text-xl font-semibold text-foreground">
            Gói gồm những gì?
          </h2>
          <ul className="mt-4 flex flex-col gap-3" data-testid="pack-benefits">
            {[pack?.headline ?? "Đề luyện bấm giờ, có giải thích từng câu", ...benefits].map((benefit, index) => (
              <li key={benefit} className="flex items-start gap-2 text-foreground" data-testid={index === 0 ? "pack-headline" : undefined}>
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Mua xong em nhận <strong>mã kích hoạt</strong> dạng <code>LT12-XXXX-XXXX-XXXX</code>, nhập được trên tối đa {maxDevices} thiết bị. Không cần tạo
            tài khoản.
          </p>
        </section>

        <section aria-labelledby="mua-goi" className="flex flex-col gap-4 rounded-card border border-border-strong bg-surface-raised p-5 sm:p-6">
          {config.ok && config.env === "test" && <TestModeNotice provider={config.provider} />}
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
            <LicenseGate productSlug={product.slug}>
              <BuyPackForm productSlug={product.slug} priceLabel={formatVnd(product.price_vnd)} />
            </LicenseGate>
          ) : (
            <Callout variant="warning" title="Tạm ngưng bán">
              {pack && !pack.sellable
                ? "Các đề trong gói đang được biên soạn, gói sẽ mở bán khi có đề. Em làm thử đề miễn phí bên dưới nhé."
                : "Gói luyện thi hiện chưa mở bán. Em quay lại sau nhé."}
            </Callout>
          )}
        </section>
      </div>

      <section aria-labelledby="xem-truoc" className="mt-10 flex flex-col gap-3">
        <h2 id="xem-truoc" className="font-serif text-2xl font-semibold text-foreground">
          Xem trước
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <figure className="m-0 flex flex-col gap-2">
            <Image src="/anh/luyen-thi/phong-thi.webp" alt="Phòng thi: câu hỏi, đồng hồ đếm ngược, phiếu trả lời bên phải" width={1200} height={806} className="rounded-card border border-border" sizes="(min-width: 768px) 420px, 100vw" />
            <figcaption className="text-sm text-muted-foreground">Phòng thi: tự lưu, làm tiếp khi tải lại trang, phím tắt, phiếu trả lời.</figcaption>
          </figure>
          <figure className="m-0 flex flex-col gap-2">
            <Image src="/anh/luyen-thi/ket-qua.webp" alt="Trang kết quả: điểm, phân tích theo bài và mức độ" width={1200} height={806} className="rounded-card border border-border" sizes="(min-width: 768px) 420px, 100vw" />
            <figcaption className="text-sm text-muted-foreground">Kết quả: điểm, phân tích theo bài / mức độ, lời giải từng câu, làm lại câu sai.</figcaption>
          </figure>
        </div>
      </section>

      <section aria-labelledby="luyen-them" className="mt-10 flex flex-col gap-3">
        <h2 id="luyen-them" className="font-serif text-2xl font-semibold text-foreground">
          Luyện thêm
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: examPaths.skills, title: "Kỹ năng làm bài (miễn phí)", text: "Cách làm câu Đúng/Sai, cách đọc tư liệu, ví dụ có lời giải." },
            { href: examPaths.practice, title: "Luyện tập theo bài", text: "Chọn bài, dạng câu, mức độ; chấm và giải thích ngay từng câu. Miễn phí 10 câu / ngày." },
            { href: examPaths.handbook, title: "Sổ tay ôn thi", text: "Mốc thời gian, sự kiện, nhân vật từng bài; in được. Bài 6 xem thử miễn phí." },
            { href: examPaths.notebook, title: "Sổ câu sai", text: "Câu em làm sai tự vào sổ; ôn lại theo lịch giãn dần để nhớ lâu." },
            { href: examPaths.overview, title: "Tổng quan", text: "Điểm dự kiến, bài nào vững / cần ôn, chuỗi ngày học và việc nên làm tiếp." },
            { href: examPaths.plan, title: "Lộ trình ôn", text: "Chọn mục tiêu điểm và số buổi mỗi tuần — web xếp lịch, tự đánh dấu buổi đã làm." },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 hover:border-accent">
              <span className="font-serif text-lg font-semibold text-foreground">{link.title}</span>
              <span className="text-sm text-muted-foreground">{link.text}</span>
            </Link>
          ))}
          {generated && (
            <Link href={examPaths.generatedHub} className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 hover:border-accent" data-testid="generated-link">
              <span className="font-serif text-lg font-semibold text-foreground">Đề tự sinh</span>
              <span className="text-sm text-muted-foreground">Mỗi lần một đề mới theo ma trận, ưu tiên câu em chưa làm.</span>
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="cac-de" className="mt-10 flex scroll-mt-20 flex-col gap-4">
        <h2 id="cac-de" className="font-serif text-2xl font-semibold text-foreground">
          Các đề luyện thi
        </h2>
        {sets === null ? (
          <Callout variant="warning" title="Chưa tải được danh sách đề">
            Em tải lại trang sau ít phút nhé.
          </Callout>
        ) : sets.length === 0 ? (
          <p className="text-muted-foreground">Các đề đang được biên soạn và kiểm duyệt. Em quay lại sau nhé.</p>
        ) : (
          <ExamSetList sets={sets} />
        )}
      </section>

      <section aria-labelledby="hoi-dap" className="mt-10 flex flex-col gap-3">
        <h2 id="hoi-dap" className="font-serif text-2xl font-semibold text-foreground">
          Câu hỏi thường gặp
        </h2>
        <div className="flex flex-col gap-2" data-testid="faq">
          {faq.map((item) => (
            <details key={item.q} className="rounded-card border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-foreground">{item.q}</summary>
              <p className="mt-2 text-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
