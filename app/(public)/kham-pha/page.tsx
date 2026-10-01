import type { Metadata } from "next";
import Link from "next/link";
import { Media3DGallery } from "@/components/explore/Media3DGallery";
import { EXPLORE_TOOLS, EXTRA_LINKS, FEATURE_LINKS, type NavLink } from "@/components/layout/nav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Khám phá",
  description: "Dòng thời gian, bản đồ lịch sử, di tích gần em, chuyên đề tương tác, tư liệu 3D và phần đọc thêm.",
};

function ToolGrid({ links }: { links: NavLink[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {links.map(({ href, label, description, icon: Icon, badge }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex h-full gap-4 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:border-border-strong hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-gold-deep">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="flex flex-wrap items-center gap-2 font-serif text-lg font-bold text-foreground">
                {label}
                {badge && <span className="rounded-md bg-muted px-1.5 font-sans text-xs font-normal text-muted-foreground">{badge}</span>}
              </span>
              {description && <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Trang tổng nhóm "Khám phá" (mục 5.1): mọi công cụ và trang trước đây không có trong menu (V-04) nằm ở một chỗ. */
export default function ExplorePage() {
  const sections = [
    { id: "cong-cu", title: "Công cụ tra cứu", text: "Xem sự kiện theo thời gian, theo địa điểm, hoặc tìm theo từ khóa.", links: EXPLORE_TOOLS },
    {
      id: "chuyen-de",
      title: "Chuyên đề tương tác",
      text: "Học sâu một sự kiện: bản đồ diễn biến từng bước, ảnh tư liệu, video, thẻ ghi nhớ và trắc nghiệm.",
      links: FEATURE_LINKS,
    },
    { id: "doc-them", title: "Đọc thêm và hướng dẫn", text: "Nội dung ngoài chương trình lớp 12 và cách dùng web.", links: EXTRA_LINKS },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Khám phá" }]} />
      <header className="mb-10 mt-5">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-[2.5rem]">Khám phá</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Các công cụ để nhìn lịch sử từ nhiều phía. Muốn học theo đúng chương trình, hãy bắt đầu từ{" "}
          <Link href="/muc-luc" className="text-accent underline">
            mục lục SGK
          </Link>
          .
        </p>
      </header>
      <div className="flex flex-col gap-12">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id} className="font-serif text-2xl font-bold text-foreground">
              {section.title}
            </h2>
            <p className="mb-4 mt-1 text-muted-foreground">{section.text}</p>
            <ToolGrid links={section.links} />
          </section>
        ))}
        <section id="tu-lieu-3d" aria-labelledby="tu-lieu-3d-tieu-de" className="scroll-mt-20">
          <h2 id="tu-lieu-3d-tieu-de" className="font-serif text-2xl font-bold text-foreground">
            Phòng tư liệu 3D
          </h2>
          <p className="mb-4 mt-1 text-muted-foreground">Hiện vật và di tích quét 3D xoay được 360°, cùng bản đồ 3D dựng minh họa.</p>
          <Media3DGallery />
        </section>
      </div>
    </div>
  );
}
