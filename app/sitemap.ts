import type { MetadataRoute } from "next";
import { interactiveEntries, immersiveEntries } from "@/lib/lessons";
import { createPublicClient } from "@/lib/supabase/public";
import { siteUrl } from "@/lib/site";
import { SGK_12, sgkLessons, sgkPaths } from "@/lib/sgk/curriculum";
import { sgkQuizPaths } from "@/lib/sgk/review";

/** sitemap.xml: trang tĩnh, mục lục và các bài SGK, chuyên đề, và mọi sự kiện / nhân vật / địa điểm / chủ đề ĐÃ CÔNG BỐ (đọc bằng quyền khách). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPaths = ["/", "/muc-luc", "/kham-pha", "/huong-dan", "/trac-nghiem/the-ghi-nho", "/bai-hoc", "/trac-nghiem", "/trac-nghiem/tong-hop", "/trac-nghiem/doan-nam", "/dong-thoi-gian", "/ban-do", "/di-tich-gan-em", "/tra-cuu"];
  const entries: MetadataRoute.Sitemap = [
    ...staticPaths.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.8 })),
    ...[...interactiveEntries, ...immersiveEntries].map((entry) => ({ url: `${base}${entry.href}`, priority: 0.9 })),
    // Khung SGK (dữ liệu tĩnh): 6 trang chủ đề, 17 trang bài.
    ...SGK_12.map((topic) => ({ url: `${base}${sgkPaths.topic(topic.slug)}`, priority: 0.8 })),
    ...sgkLessons.map((lesson) => ({ url: `${base}${sgkPaths.lesson(lesson.slug)}`, priority: 0.9 })),
    ...sgkLessons.map((lesson) => ({ url: `${base}${sgkQuizPaths.lesson(lesson.slug)}`, priority: 0.6 })),
  ];

  try {
    const supabase = await createPublicClient();
    const tables = [
      ["historical_events", "su-kien"],
      ["historical_figures", "nhan-vat"],
      ["historical_locations", "dia-diem"],
      ["curriculum_topics", "chu-de"],
    ] as const;
    const results = await Promise.all(
      tables.map(([table]) => supabase.from(table).select("slug").eq("workflow_status", "published")),
    );
    results.forEach(({ data }, index) => {
      for (const row of data ?? []) {
        entries.push({
          url: `${base}/${tables[index][1]}/${row.slug}`,
          priority: tables[index][1] === "su-kien" ? 0.8 : 0.6,
        });
      }
    });
  } catch {
    // DB lỗi: vẫn trả phần trang tĩnh thay vì làm hỏng sitemap.
  }
  return entries;
}
