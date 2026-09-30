import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** robots.txt: cho phép lập chỉ mục trang công khai, chặn khu quản trị. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/quan-tri"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
