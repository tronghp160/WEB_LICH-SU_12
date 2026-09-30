import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Quote } from "lucide-react";
import { CinemaPlayer } from "@/components/cinema3d/CinemaPlayer";
import { CountUp } from "@/components/lesson/CountUp";
import { FlipCard } from "@/components/lesson/FlipCard";
import { Reveal } from "@/components/lesson/Reveal";
import { ScrollProgress } from "@/components/lesson/ScrollProgress";
import { VideoEmbed } from "@/components/lesson/VideoEmbed";
import { BattleMapSection } from "@/components/mapfilm/BattleMapSection";
import { ModelGallery } from "@/components/model3d/ModelGallery";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SafeImage } from "@/components/ui/SafeImage";
import type { Lesson, LessonImage } from "@/lib/lessons/types";
import { getModelSpec } from "@/lib/models3d/specs";
import { quizPaths } from "@/lib/quiz/sets";
import type { ModelSpec } from "@/lib/models3d/types";

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

function specsOf(ids: string[] | undefined): ModelSpec[] {
  return (ids ?? []).map((id) => getModelSpec(id)).filter((spec): spec is ModelSpec => !!spec);
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
                <CountUp value={stat.value} className="block font-serif text-4xl font-bold" />
                <span className="text-sm text-white/85">{stat.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LinkButton href="#dien-bien" size="lg">
              Bắt đầu bài học
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
            </LinkButton>
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
          <SectionHeading id="dien-bien-tieu-de" eyebrow="Diễn biến trên bản đồ" title="Xem chiến dịch diễn ra từng bước" />
          <p className="-mt-3 mb-5 max-w-3xl text-muted-foreground">
            Bấm <strong className="text-foreground">Phát</strong> để bản đồ tự chạy qua 7 bước, hoặc chọn từng bước ở cột bên phải. Bản đồ sẽ bay từ toàn cảnh
            Đông Dương vào lòng chảo Mường Thanh; cứ điểm nào bị tiêu diệt sẽ đổi màu.
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
            <SectionHeading id="video" eyebrow="Xem phim tư liệu" title="Video về chiến dịch" />
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
          <SectionHeading id="ket-qua" eyebrow="Kết quả và ý nghĩa" title="Vì sao gọi là chiến thắng &quot;chấn động địa cầu&quot;?" />
          <ul className="grid gap-4 sm:grid-cols-3">
            {lesson.results.map((stat, index) => (
              <Reveal as="li" key={stat.label} delay={index * 100}>
                <Card className="h-full p-5 text-center">
                  <CountUp value={stat.value} className="block font-serif text-5xl font-bold text-accent" />
                  <span className="mt-1 block text-sm text-muted-foreground">{stat.label}</span>
                </Card>
              </Reveal>
            ))}
          </ul>
          {specsOf(lesson.models3d?.soLieu).length > 0 && (
            <div className="mt-8">
              <h3 className="mb-1 font-serif text-xl font-bold text-foreground">Xem những con số trên sa bàn 3D</h3>
              <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
                Lòng chảo Điện Biên Phủ dựng từ độ cao thật. Các cứ điểm đổi từ cờ Pháp sang cờ đỏ sao vàng, rồi ba con số hiện thành hình khối: 56 ngày đêm,
                16.200 quân địch, 62 máy bay. Kéo để xoay, cuộn để phóng to, bấm số trên mô hình để đọc giải thích.
              </p>
              <ModelGallery specs={specsOf(lesson.models3d?.soLieu)} label="Sa bàn 3D" />
            </div>
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
          {specsOf(lesson.models3d?.nhanVat).length > 0 && (
            <div className="mt-10">
              <h3 className="mb-1 font-serif text-xl font-bold text-foreground">Tượng bán thân 3D (cách điệu)</h3>
              <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
                Mỗi nhân vật được dựng thành tượng đồng đặt trên bệ đá có bảng tên. Khuôn mặt được giản lược, không phải chân dung; mũ và quân phục chỉ mang tính gợi ý.
              </p>
              <ModelGallery specs={specsOf(lesson.models3d?.nhanVat)} label="Chọn nhân vật" />
            </div>
          )}
        </section>

        {/* 7b. Hiện vật kháng chiến */}
        {specsOf(lesson.models3d?.hienVat).length > 0 && (
          <section aria-labelledby="hien-vat">
            <SectionHeading id="hien-vat" eyebrow="Hiện vật và trang bị" title="Nhìn tận mắt những gì làm nên chiến thắng" />
            <p className="-mt-3 mb-5 max-w-3xl text-muted-foreground">
              Xoay từng hiện vật 3D quanh mọi phía và bấm các con số trên mô hình để biết từng bộ phận dùng làm gì: khẩu pháo kéo qua núi, chiếc xe đạp thồ, người
              chiến sĩ với trang bị và chiếc máy bay vận tải của địch.
            </p>
            <ModelGallery specs={specsOf(lesson.models3d?.hienVat)} label="Chọn hiện vật" />
          </section>
        )}

        {/* 8. Di tích ngày nay */}
        {lesson.today.length > 0 && (
          <section aria-labelledby="ngay-nay">
            <SectionHeading id="ngay-nay" eyebrow="Di tích ngày nay" title="Chiến trường xưa bây giờ ra sao?" />
            {specsOf(lesson.models3d?.diTich).length > 0 && (
              <div className="mb-10">
                <h3 className="mb-1 font-serif text-xl font-bold text-foreground">Dựng lại di tích bằng 3D</h3>
                <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
                  Hầm chỉ huy được cắt bổ để thấy bên trong; đường hầm dưới đồi A1 có nút mô phỏng vụ nổ; hệ thống chiến hào cho thấy bộ đội tiến sát cứ điểm.
                  Ảnh chụp thật của các di tích nằm ngay bên dưới.
                </p>
                <ModelGallery specs={specsOf(lesson.models3d?.diTich)} label="Chọn di tích" />
              </div>
            )}
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
          </section>
        )}

        {/* 9. Ghi nhớ nhanh */}
        <section aria-labelledby="ghi-nho">
          <SectionHeading id="ghi-nho" eyebrow="Tự ôn tập" title="Ghi nhớ nhanh" />
          <p className="-mt-3 mb-5 text-muted-foreground">Đọc câu hỏi, tự trả lời trong đầu, rồi bấm để lật thẻ xem đáp án.</p>
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
                <strong>Kiểm tra nhanh:</strong> 10 câu trắc nghiệm có ảnh, chấm điểm ngay và gợi ý phần cần ôn lại.
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
