import { SectionHeading } from "@/components/lesson/sections/shared";
import { BattleMapSection } from "@/components/mapfilm/BattleMapSection";
import { Callout } from "@/components/ui/Callout";
import type { Lesson } from "@/lib/lessons/types";

/** Diễn biến trên bản đồ: bản đồ 2D từng bước (mặc định) hoặc bản đồ 3D như phim. */
export function BattleSection({ lesson }: { lesson: Lesson }) {
  return (
    <section aria-labelledby="dien-bien-tieu-de" id="dien-bien" className="scroll-mt-32 lg:scroll-mt-20">
      <SectionHeading id="dien-bien-tieu-de" eyebrow="Diễn biến trên bản đồ" title={lesson.copy.mapTitle} />
      <p className="-mt-3 mb-5 max-w-3xl text-muted-foreground">
        Bấm <strong className="text-foreground">Phát</strong> để bản đồ tự chạy qua {lesson.battle.steps.length} bước, hoặc chọn một bước trong danh sách các
        bước. {lesson.copy.mapHint}
        {lesson.mapFilm && (
          <>
            {" "}
            Chọn <strong className="text-foreground">Bản đồ 3D như phim</strong> để xem chiến dịch diễn ra trên địa hình 3D: pháo bắn, bộ đội xung phong, cứ
            điểm nổ tung và đổi cờ, có thuyết minh.
          </>
        )}
      </p>
      <BattleMapSection scenario={lesson.battle} mapFilm={lesson.mapFilm} />
      <Callout variant="warning" title="Lưu ý: bản đồ minh họa" className="mt-4 max-w-3xl">
        {lesson.battle.disclaimer}
      </Callout>
    </section>
  );
}
