import { BattleTeaser } from "@/components/home/BattleTeaser";
import { EntryCards } from "@/components/home/EntryCards";
import { FeaturedEventsSection } from "@/components/home/FeaturedEventsSection";
import { Hero } from "@/components/home/Hero";
import { TopicsSection } from "@/components/home/TopicsSection";

/** Trang tổng quan (UC01): hero + tìm nhanh, 3 lối vào, lưới chủ đề, sự kiện nổi bật. */
export default function HomePage() {
  return (
    <>
      <Hero />
      <EntryCards />
      <BattleTeaser />
      <TopicsSection />
      <FeaturedEventsSection />
    </>
  );
}
