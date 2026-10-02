import { CinemaPlayer } from "@/components/cinema3d/CinemaPlayer";
import { Credit, exhibitItem, photoItem, SectionHeading } from "@/components/lesson/sections/shared";
import { VideoEmbed } from "@/components/lesson/VideoEmbed";
import { DepthPhotoGallery } from "@/components/photo3d/DepthPhotoGallery";
import { SafeImage } from "@/components/ui/SafeImage";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import type { Lesson } from "@/lib/lessons/types";

/**
 * Mục "Tư liệu" (V-22): video, hiện vật, sa bàn 3D, di tích ngày nay, phim 3D gom vào các tab. Chỉ tab đang mở được
 * dựng (components/ui/Tabs) → mỗi lúc chỉ một trình xem nặng; video và mô hình 3D còn chờ người xem bấm mới tải.
 */
export function ResourceSection({ lesson }: { lesson: Lesson }) {
  const tabs = buildResourceTabs(lesson);
  if (tabs.length === 0) return null;
  return (
    <section aria-labelledby="tu-lieu">
      <SectionHeading id="tu-lieu" eyebrow="Tư liệu" title="Xem tận mắt: phim, hiện vật và di tích" />
      <p className="-mt-3 mb-5 max-w-3xl text-muted-foreground">
        Chọn một loại tư liệu. Video và mô hình 3D chỉ tải khi em bấm xem, dung lượng ghi rõ trên từng mục; mỗi lúc chỉ mở một trình xem.
      </p>
      <Tabs items={tabs} label="Loại tư liệu" />
    </section>
  );
}

/** Các tab của mục "Tư liệu"; tab nào không có dữ liệu thì bỏ. Nội dung chỉ được dựng khi tab mở (components/ui/Tabs). */
function buildResourceTabs(lesson: Lesson): TabItem[] {
  const tabs: TabItem[] = [];
  const [mainVideo, ...otherVideos] = lesson.videos;

  if (mainVideo) {
    tabs.push({
      id: "video",
      label: "Phim tư liệu",
      hint: `${lesson.videos.length} video`,
      content: (
        <div data-resource="video">
          <h3 className="mb-4 font-serif text-xl font-bold text-foreground">{lesson.copy.videoTitle}</h3>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <VideoEmbed video={mainVideo} />
            <div className="flex flex-col gap-6">
              {otherVideos.map((video) => (
                <VideoEmbed key={video.youtubeId} video={video} />
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Video phát từ YouTube của kênh truyền hình nêu tên; bản quyền thuộc kênh đó. Video chỉ tải khi bạn bấm phát.
          </p>
        </div>
      ),
    });
  }

  if (lesson.artifacts && lesson.artifacts.length > 0) {
    const artifacts = lesson.artifacts;
    tabs.push({
      id: "hien-vat",
      label: "Hiện vật",
      hint: `${artifacts.length}`,
      content: (
        <div data-resource="hien-vat">
          <h3 className="mb-1 font-serif text-xl font-bold text-foreground">Nhìn tận mắt những gì làm nên chiến thắng</h3>
          {artifacts.some((item) => item.scan || item.image?.depthSrc) ? (
            <>
              <p className="mb-5 max-w-3xl text-muted-foreground">
                Hiện vật có nhãn <strong className="text-foreground">360°</strong> là mô hình quét 3D từ vật thật: bấm{" "}
                <strong className="text-foreground">Xoay 360°</strong> rồi kéo để xem mọi phía. Các hiện vật khác là ảnh chụp thật xem dạng có chiều sâu,
                bấm các số để đọc từng chi tiết.
              </p>
              <DepthPhotoGallery items={artifacts.map((item) => exhibitItem(item))} label="Chọn hiện vật" />
            </>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artifacts.flatMap((item) => (item.image ? [{ ...item, image: item.image }] : [])).map((item) => (
                <li key={item.image.src}>
                  <figure className="lesson-zoom flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface">
                    <div className="overflow-hidden">
                      <SafeImage src={item.image.src} alt={item.image.alt} className="aspect-[4/3] w-full object-cover" fallbackClassName="aspect-[4/3]" />
                    </div>
                    <figcaption className="flex flex-1 flex-col gap-1 p-4">
                      <span className="font-serif text-lg font-bold text-foreground">{item.title}</span>
                      <span className="text-sm text-surface-foreground">{item.text}</span>
                      <span className="mt-auto pt-2 text-xs text-muted-foreground">
                        Ảnh: {item.image.caption} (<Credit image={item.image} />)
                      </span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    });
  }

  if (lesson.resultsScan || lesson.resultsImage?.depthSrc) {
    tabs.push({
      id: "sa-ban",
      label: "Sa bàn 3D",
      content: (
        <div data-resource="sa-ban">
          <h3 className="mb-1 font-serif text-xl font-bold text-foreground">Nhìn chiến trường bằng 3D</h3>
          <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
            Xoay sa bàn địa hình thật 360°, hoặc xem ảnh chụp từ trên cao dạng có chiều sâu và bấm các số để đọc chú thích.
          </p>
          <DepthPhotoGallery
            items={[
              ...(lesson.resultsScan ? [exhibitItem({ title: "Sa bàn lòng chảo", scan: lesson.resultsScan })] : []),
              ...(lesson.resultsImage?.depthSrc ? [photoItem(lesson.resultsImage)] : []),
            ]}
            label="Sa bàn 3D"
          />
        </div>
      ),
    });
  }

  if (lesson.today.length > 0) {
    tabs.push({
      id: "ngay-nay",
      label: "Di tích ngày nay",
      hint: `${lesson.today.length + (lesson.todayScans?.length ?? 0)}`,
      content: (
        <div data-resource="ngay-nay">
          <h3 className="mb-1 font-serif text-xl font-bold text-foreground">{lesson.copy.todayTitle}</h3>
          {lesson.today.every((image) => image.depthSrc) ? (
            <>
              <p className="mb-5 max-w-3xl text-muted-foreground">
                Mục có nhãn <strong className="text-foreground">360°</strong> xoay được mọi phía; các mục khác là ảnh chụp thật, bấm{" "}
                <strong className="text-foreground">Xem ảnh 3D</strong> rồi rê chuột hoặc kéo để nghiêng nhìn.
              </p>
              <DepthPhotoGallery
                items={[...(lesson.todayScans ?? []).map((item) => exhibitItem(item)), ...lesson.today.map((image) => photoItem(image))]}
                label="Chọn di tích"
              />
            </>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {lesson.today.map((image) => (
                <li key={image.src}>
                  <figure className="lesson-zoom overflow-hidden rounded-card border border-border bg-surface">
                    <div className="overflow-hidden">
                      <SafeImage src={image.src} alt={image.alt} className="aspect-[4/3] w-full object-cover" fallbackClassName="aspect-[4/3]" />
                    </div>
                    <figcaption className="p-3 text-sm text-surface-foreground">
                      {image.caption} <span className="text-xs text-muted-foreground">(<Credit image={image} />)</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    });
  }

  if (lesson.cinema) {
    const cinema = lesson.cinema;
    tabs.push({
      id: "phim-3d",
      label: "Phim 3D",
      content: (
        <div data-resource="phim-3d">
          <h3 className="mb-1 font-serif text-xl font-bold text-foreground">Phim 3D: {cinema.title}</h3>
          <p className="mb-5 max-w-3xl text-muted-foreground">{cinema.description}</p>
          <CinemaPlayer posterSrc={cinema.posterSrc} posterAlt={cinema.posterAlt} />
        </div>
      ),
    });
  }

  return tabs;
}
