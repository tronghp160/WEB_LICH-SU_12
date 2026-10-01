import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Presentation, Quote } from "lucide-react";
import { CinemaPlayer } from "@/components/cinema3d/CinemaPlayer";
import { CountUp } from "@/components/lesson/CountUp";
import { FlipCard } from "@/components/lesson/FlipCard";
import { LessonStudiedMarker } from "@/components/progress/LessonStudiedMarker";
import { PASSPORT_HREF } from "@/components/progress/StampNotice";
import { Reveal } from "@/components/lesson/Reveal";
import { ScrollProgress } from "@/components/lesson/ScrollProgress";
import { VideoEmbed } from "@/components/lesson/VideoEmbed";
import { BattleMapSection } from "@/components/mapfilm/BattleMapSection";
import { DepthPhotoGallery, type DepthPhotoItem } from "@/components/photo3d/DepthPhotoGallery";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SafeImage } from "@/components/ui/SafeImage";
import type { Lesson, LessonExhibit, LessonImage } from "@/lib/lessons/types";
import { quizPaths } from "@/lib/quiz/sets";

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <header className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold-deep">{eyebrow}</p>
      <h2 id={id} className="mt-1 font-serif text-2xl font-bold text-foreground sm:text-3xl">
        {title}
      </h2>
    </header>
  );
}

function Credit({ image }: { image: LessonImage }) {
  return (
    <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
      {image.credit}
    </a>
  );
}

/** Hiện vật (ảnh thật và/hoặc mô hình quét 360°) → mục của thư viện 3D. */
function exhibitItem(exhibit: LessonExhibit): DepthPhotoItem {
  const base = exhibit.image ? photoItem(exhibit.image) : { id: `scan-${exhibit.scan!.sketchfabId}` };
  return { ...base, title: exhibit.title, text: exhibit.text, image: exhibit.image, scan: exhibit.scan };
}

/** Ảnh bài học → mục của thư viện ảnh 3D (tiêu đề ngắn lấy từ chú thích nếu không có). */
function photoItem(image: LessonImage): DepthPhotoItem {
  const id = image.src.split("/").pop()!.replace(/\.webp$/, "");
  return { id, title: image.title ?? image.caption.split(/[—(,.]/)[0].trim(), image };
}

function initials(name: string): string {
  const words = name.split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

/** Trang "Bài học tương tác": ảnh mở đầu → SGK → mốc thời gian → bản đồ diễn biến → video → kết quả → nhân vật → di tích → ghi nhớ. */
export function LessonView({ lesson }: { lesson: Lesson }) {
  const [mainVideo, ...otherVideos] = lesson.videos;

  return (
    <article>
      <ScrollProgress />

      {/* 1. Mở đầu toàn màn hình */}
      <section aria-labelledby="bai-hoc-tieu-de" className="relative isolate flex min-h-[34rem] items-end overflow-hidden bg-black sm:min-h-[40rem]">
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh đã nén trong public/, là phần tử LCP */}
        <img
          src={lesson.hero.src}
          alt={lesson.hero.alt}
          fetchPriority="high"
          className="lesson-kenburns absolute inset-0 -z-10 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/10" aria-hidden="true" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-24 text-white sm:px-6">
          <Badge variant="accent" className="mb-4">
            Bài học tương tác
          </Badge>
          <h1 id="bai-hoc-tieu-de" className="lesson-rise font-serif text-4xl font-bold text-balance sm:text-6xl">
            {lesson.title}
          </h1>
          <p className="lesson-rise mt-3 text-xl font-semibold text-[#f3d9a4]" style={{ animationDelay: "120ms" }}>
            {lesson.dateText}
          </p>
          <p className="lesson-rise mt-4 max-w-2xl text-lg text-white/90" style={{ animationDelay: "240ms" }}>
            {lesson.tagline}
          </p>
          <ul className="mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Số liệu chính">
            {lesson.heroStats.map((stat) => (
              <li key={stat.label} className="rounded-card border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <span className="block font-serif text-4xl font-bold">
                  <CountUp value={stat.value} />
                  {stat.suffix}
                </span>
                <span className="text-sm text-white/85">{stat.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LinkButton href="#dien-bien" size="lg">
              Bắt đầu bài học
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
            </LinkButton>
            <Link
              href={`/bai-hoc/${lesson.slug}/trinh-chieu`}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/40 px-6 text-base font-medium text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <Presentation className="h-5 w-5" aria-hidden="true" />
              Trình chiếu trên lớp
            </Link>
            <p className="text-xs text-white/70">
              Ảnh: {lesson.hero.caption} <Credit image={lesson.hero} />
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-20 pt-8 sm:px-6">
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Bài học tương tác" },
            { label: lesson.title },
          ]}
        />

        {/* 2. Trong SGK */}
        <Reveal as="section" className="-mt-8">
          <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:gap-6">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-bold">Học xong bài này, em có thể…</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lesson.textbook.series} · {lesson.textbook.lesson}
              </p>
              <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
                {lesson.textbook.objectives.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Card>
        </Reveal>

        {/* 3. Mốc thời gian */}
        <section aria-labelledby="moc-thoi-gian">
          <SectionHeading id="moc-thoi-gian" eyebrow="Dòng thời gian" title="Những mốc cần nhớ" />
          <ol className="lesson-timeline grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lesson.keyDates.map((item, index) => (
              <Reveal as="li" key={item.date} delay={index * 90} className="lesson-timeline__item">
                <Card className="h-full p-4">
                  <p className="font-serif text-lg font-bold text-accent">{item.date}</p>
                  <p className="mt-1 text-sm text-surface-foreground">{item.text}</p>
                </Card>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* 4. Bản đồ diễn biến */}
        <section aria-labelledby="dien-bien-tieu-de" id="dien-bien" className="scroll-mt-20">
          <SectionHeading id="dien-bien-tieu-de" eyebrow="Diễn biến trên bản đồ" title={lesson.copy.mapTitle} />
          <p className="-mt-3 mb-5 max-w-3xl text-muted-foreground">
            Bấm <strong className="text-foreground">Phát</strong> để bản đồ tự chạy qua {lesson.battle.steps.length} bước, hoặc chọn từng bước ở cột bên phải.{" "}
            {lesson.copy.mapHint}
            {lesson.mapFilm && (
              <>
                {" "}
                Chọn <strong className="text-foreground">Bản đồ 3D như phim</strong> để xem chiến dịch diễn ra trên địa hình 3D: pháo bắn, bộ đội xung phong, cứ
                điểm nổ tung và đổi cờ, có thuyết minh.
              </>
            )}
          </p>
          <BattleMapSection scenario={lesson.battle} mapFilm={lesson.mapFilm} />
          <p className="mt-4 max-w-3xl rounded-card border border-border bg-muted p-4 text-sm text-foreground" role="note">
            <strong>Lưu ý: </strong>
            {lesson.battle.disclaimer}
          </p>
        </section>

        {/* 4b. Phim 3D dựng trong trình duyệt */}
        {lesson.cinema && (
          <section aria-labelledby="phim-3d">
            <SectionHeading id="phim-3d" eyebrow="Xem như một bộ phim" title={`Phim 3D: ${lesson.cinema.title}`} />
            <p className="-mt-3 mb-5 max-w-3xl text-muted-foreground">{lesson.cinema.description}</p>
            <CinemaPlayer posterSrc={lesson.cinema.posterSrc} posterAlt={lesson.cinema.posterAlt} />
          </section>
        )}

        {/* 5. Video */}
        {mainVideo && (
          <section aria-labelledby="video">
            <SectionHeading id="video" eyebrow="Xem phim tư liệu" title={lesson.copy.videoTitle} />
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
          </section>
        )}

        {/* 6. Kết quả và ý nghĩa */}
        <section aria-labelledby="ket-qua">
          <SectionHeading id="ket-qua" eyebrow="Kết quả và ý nghĩa" title={lesson.copy.resultsTitle} />
          <ul className="grid gap-4 sm:grid-cols-3">
            {lesson.results.map((stat, index) => (
              <Reveal as="li" key={stat.label} delay={index * 100}>
                <Card className="h-full p-5 text-center">
                  <span className="block font-serif text-5xl font-bold text-accent">
                    <CountUp value={stat.value} />
                    {stat.suffix}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{stat.label}</span>
                </Card>
              </Reveal>
            ))}
          </ul>
          {(lesson.resultsScan || lesson.resultsImage?.depthSrc) && (
            <div className="mt-8">
              <h3 className="mb-1 font-serif text-xl font-bold text-foreground">Nhìn lòng chảo bằng 3D</h3>
              <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
                Xoay sa bàn địa hình thật của lòng chảo 360°, hoặc xem ảnh chụp từ trên cao năm 1953 dạng có chiều sâu và bấm các số để đọc chú thích.
              </p>
              <DepthPhotoGallery
                items={[
                  ...(lesson.resultsScan ? [exhibitItem({ title: "Sa bàn lòng chảo", scan: lesson.resultsScan })] : []),
                  ...(lesson.resultsImage?.depthSrc ? [photoItem(lesson.resultsImage)] : []),
                ]}
                label="Lòng chảo Điện Biên Phủ 3D"
              />
            </div>
          )}
          {lesson.resultsImage && !lesson.resultsImage.depthSrc && (
            <figure className="mt-8 overflow-hidden rounded-card border border-border bg-surface">
              <SafeImage src={lesson.resultsImage.src} alt={lesson.resultsImage.alt} className="max-h-[32rem] w-full object-cover" fallbackClassName="aspect-[16/9]" />
              <figcaption className="p-3 text-sm text-surface-foreground">
                {lesson.resultsImage.caption}{" "}
                <span className="text-xs text-muted-foreground">
                  (<Credit image={lesson.resultsImage} />)
                </span>
              </figcaption>
            </figure>
          )}
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {lesson.significance.map((item, index) => (
              <Reveal as="li" key={item.title} delay={index * 100}>
                <Card className="h-full border-l-4 border-l-gold p-5">
                  <h3 className="font-serif text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-surface-foreground">{item.text}</p>
                </Card>
              </Reveal>
            ))}
          </ul>
          {lesson.quote && (
            <Reveal className="mt-8">
              <figure className="mx-auto max-w-2xl text-center">
                <Quote className="mx-auto h-8 w-8 text-gold" aria-hidden="true" />
                <blockquote className="mt-2 whitespace-pre-line font-serif text-2xl italic text-foreground">{lesson.quote.text}</blockquote>
                <figcaption className="mt-2 text-sm text-muted-foreground">— {lesson.quote.author}</figcaption>
              </figure>
            </Reveal>
          )}
        </section>

        {/* 7. Nhân vật */}
        <section aria-labelledby="nhan-vat">
          <SectionHeading id="nhan-vat" eyebrow="Nhân vật" title="Những con người làm nên lịch sử" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lesson.figures.map((figure) => (
              <li key={figure.name} className="flex flex-col gap-2">
                <FlipCard
                  className="h-72"
                  front={
                    <>
                      {figure.image ? (
                        <SafeImage
                          src={figure.image.src}
                          alt={figure.image.alt}
                          className="h-36 w-full rounded-md object-cover object-top"
                          fallbackClassName="h-36 rounded-md"
                        />
                      ) : (
                        <span
                          className="flex h-36 w-full items-center justify-center rounded-md bg-muted font-serif text-4xl font-bold text-accent"
                          aria-hidden="true"
                        >
                          {initials(figure.name)}
                        </span>
                      )}
                      <span className="mt-3 block font-serif text-lg font-bold">{figure.name}</span>
                      <span className="block text-sm text-muted-foreground">{figure.role}</span>
                    </>
                  }
                  back={
                    <>
                      <span className="block font-serif text-lg font-bold">{figure.name}</span>
                      <span className="mt-2 block text-sm leading-relaxed">{figure.text}</span>
                    </>
                  }
                />
                {figure.href && (
                  <Link href={figure.href} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                    Xem trang nhân vật
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
                {figure.image && (
                  <p className="text-xs text-muted-foreground">
                    Ảnh: <Credit image={figure.image} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* 7b. Hiện vật và trang bị (ảnh chụp thật) */}
        {lesson.artifacts && lesson.artifacts.length > 0 && (
          <section aria-labelledby="hien-vat">
            <SectionHeading id="hien-vat" eyebrow="Hiện vật và trang bị" title="Nhìn tận mắt những gì làm nên chiến thắng" />
            {lesson.artifacts.some((item) => item.scan || item.image?.depthSrc) ? (
              <>
                <p className="-mt-3 mb-5 max-w-3xl text-muted-foreground">
                  Hiện vật có nhãn <strong className="text-foreground">360°</strong> là mô hình quét 3D từ vật thật: bấm <strong className="text-foreground">Xoay 360°</strong>{" "}
                  rồi kéo để xem mọi phía, cuộn để phóng to. Các hiện vật khác là ảnh chụp thật xem dạng có chiều sâu, bấm các số để đọc từng chi tiết.
                </p>
                <DepthPhotoGallery items={lesson.artifacts.map((item) => exhibitItem(item))} label="Chọn hiện vật" />
              </>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lesson.artifacts.flatMap((item) => (item.image ? [{ ...item, image: item.image }] : [])).map((item, index) => (
                  <Reveal as="li" key={item.image.src} delay={(index % 3) * 100}>
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
                  </Reveal>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 8. Di tích ngày nay */}
        {lesson.today.length > 0 && (
          <section aria-labelledby="ngay-nay">
            <SectionHeading id="ngay-nay" eyebrow="Di tích ngày nay" title={lesson.copy.todayTitle} />
            {lesson.today.every((image) => image.depthSrc) ? (
              <>
                <p className="-mt-3 mb-5 max-w-3xl text-muted-foreground">
                  Chọn di tích: mục có nhãn <strong className="text-foreground">360°</strong> xoay được mọi phía; các mục khác là ảnh chụp thật, bấm{" "}
                  <strong className="text-foreground">Xem ảnh 3D</strong> rồi rê chuột hoặc kéo để nghiêng nhìn.
                </p>
                <DepthPhotoGallery
                  items={[...(lesson.todayScans ?? []).map((item) => exhibitItem(item)), ...lesson.today.map((image) => photoItem(image))]}
                  label="Chọn di tích"
                />
              </>
            ) : (
              <>
            <h3 className="mb-3 font-serif text-lg font-bold text-foreground">Ảnh chụp di tích ngày nay</h3>
              <ul className="grid gap-4 sm:grid-cols-2">
                {lesson.today.map((image, index) => (
                  <Reveal as="li" key={image.src} delay={(index % 2) * 120}>
                    <figure className="lesson-zoom overflow-hidden rounded-card border border-border bg-surface">
                      <div className="overflow-hidden">
                        <SafeImage src={image.src} alt={image.alt} className="aspect-[4/3] w-full object-cover" fallbackClassName="aspect-[4/3]" />
                      </div>
                      <figcaption className="p-3 text-sm text-surface-foreground">
                        {image.caption} <span className="text-xs text-muted-foreground">(<Credit image={image} />)</span>
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </ul>
              </>
            )}
          </section>
        )}

        {/* 9. Ghi nhớ nhanh */}
        <section aria-labelledby="ghi-nho">
          <SectionHeading id="ghi-nho" eyebrow="Tự ôn tập" title="Ghi nhớ nhanh" />
          <p className="-mt-3 mb-5 text-muted-foreground">Đọc câu hỏi, tự trả lời trong đầu, rồi bấm để lật thẻ xem đáp án.</p>
          <LessonStudiedMarker slug={lesson.slug} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lesson.flashcards.map((card, index) => (
              <li key={card.question}>
                <FlipCard
                  className="h-52"
                  front={
                    <>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Câu {index + 1}</span>
                      <span className="mt-2 block font-medium">{card.question}</span>
                    </>
                  }
                  back={
                    <>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Đáp án</span>
                      <span className="mt-2 block font-medium">{card.answer}</span>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
          {lesson.quiz && lesson.quiz.length > 0 && (
            <div className="mt-6 flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-foreground">
                <strong>Kiểm tra nhanh:</strong> 10 câu trắc nghiệm có ảnh, chấm điểm ngay và gợi ý phần cần ôn lại. Đạt từ
                7/10 là em được đóng dấu vào{" "}
                <Link href={PASSPORT_HREF} className="text-accent underline">
                  Hộ chiếu lịch sử
                </Link>
                .
              </p>
              <LinkButton href={quizPaths.lesson(lesson.slug)} size="lg">
                Làm trắc nghiệm
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </LinkButton>
            </div>
          )}
        </section>

        {/* 10. Nguồn */}
        <section aria-labelledby="nguon" className="border-t border-border pt-8">
          <h2 id="nguon" className="font-serif text-xl font-bold">
            Nguồn tham khảo và giấy phép
          </h2>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {lesson.battle.sources.map((source) => (
              <li key={source.title}>
                {source.title}
                {source.note && <span className="text-muted-foreground"> — {source.note}</span>}
              </li>
            ))}
            <li>Ảnh tư liệu và ảnh di tích: Wikimedia Commons, tác giả và giấy phép ghi dưới từng ảnh (bấm để xem trang gốc).</li>
            <li>Bản đồ nền: © OpenStreetMap contributors.</li>
          </ul>
          <details className="mt-4 rounded-card border border-border bg-muted p-4 text-sm">
            <summary className="cursor-pointer font-medium">Ghi chú biên soạn: các chi tiết đang được đối chiếu với SGK</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              {lesson.toVerify.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
          <div className="mt-6">
            <LinkButton href={`/su-kien/${lesson.eventSlug}`} variant="secondary">
              Xem trang sự kiện {lesson.title}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
          </div>
        </section>
      </div>
    </article>
  );
}
