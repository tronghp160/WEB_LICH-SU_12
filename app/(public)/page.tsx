import { cache, Suspense } from "react";
import { CoachMarks } from "@/components/home/CoachMarks";
import { FeaturedStrip } from "@/components/home/FeaturedStrip";
import { GoalPicker } from "@/components/home/GoalPicker";
import { Hero } from "@/components/home/Hero";
import { OnThisDayStrip } from "@/components/home/OnThisDayStrip";
import { SgkTocCompact } from "@/components/home/SgkTocCompact";
import { getHeroSlides, getOnThisDay } from "@/lib/queries/home";

// Hai nguồn dữ liệu duy nhất của trang chủ. Bọc cache(): các khối và dải báo lỗi dùng chung một lần gọi trong request.
const loadHeroSlides = cache(async () => {
  try {
    return { ok: true as const, slides: await getHeroSlides() };
  } catch {
    return { ok: false as const, slides: [] };
  }
});

const loadOnThisDay = cache(async () => {
  try {
    return { ok: true as const, result: await getOnThisDay() };
  } catch {
    return { ok: false as const, result: null };
  }
});

async function HeroWithSlides() {
  const { slides } = await loadHeroSlides();
  return <Hero slides={slides} />;
}

async function OnThisDayBlock() {
  const { result } = await loadOnThisDay();
  return <OnThisDayStrip result={result} />;
}

/** Database lỗi: MỘT dải thông báo nhỏ thay cho nhiều khối báo lỗi to (V-15). Mục lục SGK là dữ liệu tĩnh nên vẫn hiện đủ. */
async function DataStatusBanner() {
  const [hero, onThisDay] = await Promise.all([loadHeroSlides(), loadOnThisDay()]);
  if (hero.ok && onThisDay.ok) return null;
  return (
    <p role="status" className="border-b border-warning/30 bg-warning-bg px-4 py-2 text-center text-sm text-foreground">
      Chưa tải được một phần dữ liệu (ảnh tư liệu, sự kiện). Mục lục và các bài vẫn dùng được — tải lại trang sau ít phút.
    </p>
  );
}

/**
 * Trang chủ — "bảng điều khiển học tập" (mục 6.1): trong 5 giây người mới hiểu web dùng để làm gì; người cũ bấm một lần
 * là học tiếp. Hero chữ hiện ngay, ảnh và dữ liệu stream vào sau.
 */
export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <DataStatusBanner />
      </Suspense>
      <Suspense fallback={<Hero />}>
        <HeroWithSlides />
      </Suspense>
      <GoalPicker />
      <SgkTocCompact />
      <FeaturedStrip />
      <Suspense fallback={null}>
        <OnThisDayBlock />
      </Suspense>
      <div className="pb-16" />
      <CoachMarks />
    </>
  );
}
