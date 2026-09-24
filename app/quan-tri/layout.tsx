import type { Metadata } from "next";

// Khu vực nội bộ: không cho công cụ tìm kiếm lập chỉ mục.
export const metadata: Metadata = {
  title: { default: "Khu vực nội bộ", template: "%s · Khu vực nội bộ" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/quan-tri">) {
  return children;
}
