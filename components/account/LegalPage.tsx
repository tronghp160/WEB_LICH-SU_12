import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { contactEmail, TERMS_UPDATED_AT, TERMS_VERSION } from "@/lib/legal";

/** Khung chung của trang Điều khoản / Chính sách: tiêu đề, phiên bản, nội dung dạng văn bản dài. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: title }]} />
      <h1 className="mt-4 font-serif text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Phiên bản {TERMS_VERSION} · cập nhật {TERMS_UPDATED_AT}
      </p>
      <div className="mt-6 flex flex-col gap-4 leading-relaxed text-foreground [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </article>
  );
}

/** Cách liên hệ nhóm thực hiện: email nếu đã cấu hình, không thì tên đơn vị. */
export function ContactLine() {
  const email = contactEmail();
  return email ? (
    <a href={`mailto:${email}`} className="text-accent underline">
      {email}
    </a>
  ) : (
    <>nhóm thực hiện đồ án (Viện Công nghệ số, Trường Đại học Thủ Dầu Một)</>
  );
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-accent underline">
      {children}
    </Link>
  );
}
