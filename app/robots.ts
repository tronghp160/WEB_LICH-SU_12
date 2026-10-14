import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** robots.txt: cho phép lập chỉ mục trang công khai, chặn khu quản trị và các trang tài khoản / xác thực. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/quan-tri", "/tai-khoan", "/auth/", "/dat-lai-mat-khau", "/dang-ky/kiem-tra-email", "/dang-ky/hoan-tat"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
