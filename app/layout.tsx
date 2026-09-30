import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import { DEFAULT_SHARE_IMAGE, siteUrl } from "@/lib/site";
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
    "Hệ thống hỗ trợ tìm hiểu Lịch sử Việt Nam lớp 12 qua bản đồ và dòng thời gian tương tác.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${lora.variable} ${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
