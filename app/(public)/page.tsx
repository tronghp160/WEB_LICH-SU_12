import { Suspense } from "react";
import { EntryCards } from "@/components/home/EntryCards";
import { FeaturedEventsSection } from "@/components/home/FeaturedEventsSection";
import { Hero } from "@/components/home/Hero";
import { LessonsTeaser } from "@/components/home/LessonsTeaser";
import { OnThisDaySection } from "@/components/home/OnThisDaySection";
import { TopicsSection } from "@/components/home/TopicsSection";
import { getHeroSlides } from "@/lib/queries/home";

/** Hero có ảnh; ảnh lỗi tải (mạng, DB) thì giữ Hero chữ, không làm hỏng trang. */
async function HeroWithSlides() {
  const slides = await getHeroSlides().catch(() => []);
  return <Hero slides={slides} />;
}

/**
 * Trang tổng quan (UC01) — "ảnh thật đi trước": Hero trình chiếu ảnh tư liệu, bài học tương tác ngay sau đó,
 * hôm nay trong lịch sử, 3 lối vào, lưới chủ đề, sự kiện nổi bật. Hero chữ hiện ngay, ảnh stream vào sau.
 */
export default function HomePage() {
  return (
    <>
      <Suspense fallback={<Hero />}>
        <HeroWithSlides />
      </Suspense>
      <LessonsTeaser />
      <OnThisDaySection />
      <EntryCards />
      <TopicsSection />
      <FeaturedEventsSection />
    </>
  );
}
