import Link from "next/link";
import { EXPLORE_TOOLS, REVIEW_LINKS } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { sgkPaths } from "@/lib/sgk/curriculum";

const linkClass = "hover:text-foreground hover:underline";

/** Chân trang 3 cột (mục 9, GĐ1): Học · Khám phá · Về dự án. */
export function Footer() {
  return (
    <footer className="border-t border-border bg-sunken print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-3 sm:px-6">
        <section aria-labelledby="footer-hoc">
          <h2 id="footer-hoc" className="mb-3 font-semibold text-foreground">
            Học
          </h2>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href={sgkPaths.toc} className={linkClass}>
                Mục lục SGK (17 bài)
              </Link>
            </li>
            {REVIEW_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="footer-kham-pha">
          <h2 id="footer-kham-pha" className="mb-3 font-semibold text-foreground">
            Khám phá
          </h2>
          <ul className="flex flex-col gap-2">
            {EXPLORE_TOOLS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/kham-pha" className={linkClass}>
                Chuyên đề và tư liệu 3D
              </Link>
            </li>
          </ul>
        </section>
        <section aria-labelledby="footer-du-an">
          <h2 id="footer-du-an" className="mb-3 font-semibold text-foreground">
            Về dự án
          </h2>
          <p>
            Đây là <strong className="text-foreground">công cụ hỗ trợ học tập</strong>, không thay thế sách giáo khoa. Mốc thời gian gần
            đúng/tranh luận và tọa độ ước lượng đều được ghi chú trên từng nội dung.
          </p>
          <p className="mt-2">
            <Link href="/huong-dan" className={linkClass}>
              Hướng dẫn sử dụng
            </Link>
            {" · "}
            Dữ liệu bản đồ ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className={linkClass}>
              OpenStreetMap contributors
            </a>
          </p>
          <p className="mt-2">Đồ án cơ sở ngành — Viện Công nghệ số, Trường Đại học Thủ Dầu Một.</p>
          <div className="mt-4 flex items-center gap-3">
            <span>Giao diện</span>
            <ThemeToggle />
          </div>
        </section>
      </div>
    </footer>
  );
}
