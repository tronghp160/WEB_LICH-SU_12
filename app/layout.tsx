import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import { DEFAULT_SHARE_IMAGE, siteUrl } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["vietnamese", "latin"],
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  openGraph: {
    siteName: "Lịch sử Việt Nam 12",
    locale: "vi_VN",
    type: "website",
    images: [DEFAULT_SHARE_IMAGE],
  },
  title: {
    default: "Lịch sử Việt Nam 12",
    template: "%s · Lịch sử Việt Nam 12",
  },
  description:
    "Học Lịch sử 12 theo từng bài sách giáo khoa, với bản đồ diễn biến, ảnh tư liệu và trắc nghiệm.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: script đầu trang đặt data-theme trước khi React chạy (lib/theme.ts).
    <html
      lang="vi"
      className={`${lora.variable} ${beVietnamPro.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
