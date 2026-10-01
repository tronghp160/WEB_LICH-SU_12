// Sinh câu hỏi trắc nghiệm và vòng "Đoán năm" từ dữ liệu ĐÃ CÔNG BỐ (GĐ4.1–4.2).
//
// Câu tự sinh chỉ ghép lại những gì đã qua kiểm duyệt (ảnh ↔ sự kiện, năm, tên nhân vật, tên địa điểm), nên không
// đưa thêm thông tin mới. Hàm thuần và TẤT ĐỊNH (cùng dữ liệu → cùng câu hỏi, cùng đáp án nhiễu): trình chơi ở
// trình duyệt mới xáo thứ tự câu và đáp án cho mỗi lượt chơi.

import type {
  QuizQuestion,
  QuizSourceData,
  SourceEvent,
  SourceImage,
  YearRound,
  QuizImage,
} from "@/lib/quiz/types";

/** Tối thiểu 4 lựa chọn khác nhau mới sinh được câu hỏi. */
const CHOICES = 4;
/** Năm của sự kiện đủ chắc chắn để hỏi (bỏ "khoảng", "còn tranh luận"). */
const YEAR_PRECISIONS = new Set(["exact", "year", "period"]);

/** Băm chuỗi thành số (FNV-1a) — để chọn đáp án nhiễu "ngẫu nhiên" nhưng ổn định. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Chọn `count` phần tử khác nhau theo thứ tự băm của `seed` (ổn định giữa các lần gọi). */
function stablePick<T>(items: readonly T[], count: number, seed: string, key: (item: T) => string): T[] {
  return [...items]
    .sort((a, b) => hashString(`${seed}|${key(a)}`) - hashString(`${seed}|${key(b)}`))
    .slice(0, count);
}

/** Câu đầu tiên của một đoạn văn (để giải thích ngắn gọn). */
export function firstSentence(text: string | null | undefined, maxLength = 220): string {
  if (!text) return "";
  const plain = text.replace(/[*#>_`]/g, "").replace(/\s+/g, " ").trim();
  const match = /^(.+?[.!?…])(\s|$)/.exec(plain);
  const sentence = match ? match[1] : plain;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1).trimEnd()}…` : sentence;
}

function images(list: readonly SourceImage[], filter: (image: SourceImage) => boolean): SourceImage[] {
  return list
    .filter(filter)
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder);
}

function toQuizImage(image: SourceImage): QuizImage {
  return {
    url: image.url,
    alt: image.alt,
    caption: image.caption,
    labels: image.labels,
    neutralLabels: image.neutralLabels,
    photographer: image.photographer,
    license: image.license,
    licenseUrl: image.licenseUrl,
    sourcePageUrl: image.sourcePageUrl,
    focalPoint: image.focalPoint,
    width: image.width,
    height: image.height,
  };
}

const eventHref = (slug: string) => `/su-kien/${slug}`;

/** Ghép đáp án đúng vào đầu danh sách (trình chơi xáo lại sau). */
function withAnswer(answer: string, distractors: string[]): { choices: string[]; correctIndex: number } | null {
  const choices = [answer, ...distractors.filter((item) => item !== answer)];
  return new Set(choices).size === CHOICES && choices.length === CHOICES ? { choices, correctIndex: 0 } : null;
}

/** 3 sự kiện khác làm đáp án nhiễu: ưu tiên sự kiện gần năm (khó đoán mò hơn), chọn ổn định trong 5 sự kiện gần nhất. */
function eventDistractors(events: readonly SourceEvent[], target: SourceEvent, seed: string): string[] {
  const others = events
    .filter((event) => event.id !== target.id && event.title !== target.title)
    .sort((a, b) => Math.abs(a.startYear - target.startYear) - Math.abs(b.startYear - target.startYear) || a.slug.localeCompare(b.slug))
    .slice(0, 5);
  return stablePick(others, CHOICES - 1, seed, (event) => event.slug).map((event) => event.title);
}

/** 3 năm nhiễu: năm của các sự kiện khác gần nhất, thiếu thì thêm năm lệch vài năm. */
export function yearDistractors(year: number, otherYears: readonly number[]): number[] {
  const picked: number[] = [];
  const candidates = [...new Set(otherYears)]
    .filter((other) => other !== year)
    .sort((a, b) => Math.abs(a - year) - Math.abs(b - year) || a - b);
  for (const offset of [-1, 1, -2, 2, -3, 3, -5, 5, -10, 10]) candidates.push(year + offset);
  for (const candidate of candidates) {
    if (picked.length === CHOICES - 1) break;
    if (candidate !== year && !picked.includes(candidate)) picked.push(candidate);
  }
  return picked;
}

/** Toàn bộ câu hỏi có thể có từ dữ liệu đã công bố (câu soạn tay trước, rồi câu tự sinh). */
export function buildQuestionPool(data: QuizSourceData): QuizQuestion[] {
  const eventsById = new Map(data.events.map((event) => [event.id, event]));
  const questions: QuizQuestion[] = [];

  // Sự kiện gắn với một nhân vật / địa điểm → để lọc câu hỏi chân dung, di tích theo chủ đề và bài học.
  const linkedEvents = (predicate: (event: SourceEvent) => boolean) => data.events.filter(predicate);
  const topicsOf = (events: readonly SourceEvent[]) => [...new Set(events.flatMap((event) => event.topicSlugs))];

  // ---- 1. Câu soạn tay ----
  for (const row of data.authored) {
    const event = eventsById.get(row.eventId);
    if (!event || row.choices.length !== CHOICES) continue;
    const image = row.mediaId ? event.images.find((item) => item.id === row.mediaId) : undefined;
    questions.push({
      id: `soan:${row.id}`,
      kind: "authored",
      prompt: row.question,
      image: image ? toQuizImage(image) : undefined,
      choices: row.choices,
      correctIndex: row.correctIndex,
      explanation: row.explanation,
      review: { href: eventHref(event.slug), label: event.title },
      eventSlugs: [event.slug],
      topicSlugs: event.topicSlugs,
    });
  }

  // ---- 2. Ảnh tư liệu → sự kiện nào? ----
  if (data.events.length >= CHOICES) {
    for (const event of data.events) {
      for (const image of images(event.images, (item) => item.era !== "today")) {
        const id = `anh-su-kien:${image.id}`;
        const options = withAnswer(event.title, eventDistractors(data.events, event, id));
        if (!options) continue;
        questions.push({
          id,
          kind: "photo-event",
          prompt: image.era === "illustration" ? "Bức tranh minh họa này gắn với sự kiện nào?" : "Bức ảnh tư liệu này gắn với sự kiện nào?",
          image: toQuizImage(image),
          ...options,
          explanation: [`Đây là ${image.era === "illustration" ? "tranh minh họa" : "ảnh tư liệu"} về sự kiện “${event.title}” (${event.dateText}).`, image.caption ?? "", firstSentence(event.summary)]
            .filter(Boolean)
            .join(" "),
          review: { href: eventHref(event.slug), label: event.title },
          eventSlugs: [event.slug],
          topicSlugs: event.topicSlugs,
        });
      }
    }
  }

  // ---- 3. Sự kiện → năm nào? ----
  const years = data.events.map((event) => event.startYear);
  for (const event of data.events) {
    if (!YEAR_PRECISIONS.has(event.datePrecision)) continue;
    const options = withAnswer(String(event.startYear), yearDistractors(event.startYear, years).map(String));
    if (!options) continue;
    const cover = images(event.images, (item) => item.era !== "today")[0] ?? images(event.images, () => true)[0];
    questions.push({
      id: `nam:${event.id}`,
      kind: "event-year",
      prompt: `Sự kiện “${event.title}” diễn ra vào năm nào?`,
      image: cover ? toQuizImage(cover) : undefined,
      ...options,
      explanation: `“${event.title}”: ${event.dateText}. ${firstSentence(event.summary)}`.trim(),
      review: { href: eventHref(event.slug), label: event.title },
      eventSlugs: [event.slug],
      topicSlugs: event.topicSlugs,
    });
  }

  // ---- 4. Chân dung → ai? ----
  if (data.figures.length >= CHOICES) {
    for (const figure of data.figures) {
      const portrait = images(figure.images, (item) => item.era === "historical")[0];
      if (!portrait) continue;
      const id = `chan-dung:${figure.id}`;
      const others = data.figures.filter((other) => other.id !== figure.id);
      const options = withAnswer(figure.name, stablePick(others, CHOICES - 1, id, (other) => other.slug).map((other) => other.name));
      if (!options) continue;
      const events = linkedEvents((event) => event.figureIds.includes(figure.id));
      questions.push({
        id,
        kind: "portrait",
        prompt: "Đây là chân dung của ai?",
        image: toQuizImage(portrait),
        ...options,
        explanation: [`Đây là ${figure.name}.`, portrait.caption ?? "", firstSentence(figure.biography)].filter(Boolean).join(" "),
        review: { href: `/nhan-vat/${figure.slug}`, label: figure.name },
        eventSlugs: events.map((event) => event.slug),
        topicSlugs: topicsOf(events),
      });
    }
  }

  // ---- 5. Ảnh di tích ngày nay → nơi nào? ----
  const placesWithPhoto = data.locations.filter((location) => location.images.some((item) => item.era === "today"));
  if (placesWithPhoto.length >= CHOICES) {
    for (const location of placesWithPhoto) {
      const photo = images(location.images, (item) => item.era === "today")[0];
      const id = `di-tich:${location.id}`;
      const others = placesWithPhoto.filter((other) => other.id !== location.id);
      const options = withAnswer(location.name, stablePick(others, CHOICES - 1, id, (other) => other.slug).map((other) => other.name));
      if (!options) continue;
      const events = linkedEvents((event) => event.locationIds.includes(location.id));
      questions.push({
        id,
        kind: "place-photo",
        prompt: "Nơi này ngày nay là địa điểm, di tích nào?",
        image: toQuizImage(photo),
        ...options,
        explanation: [`Đây là ${location.name}.`, photo.caption ?? "", firstSentence(location.description)].filter(Boolean).join(" "),
        review: { href: `/dia-diem/${location.slug}`, label: location.name },
        eventSlugs: events.map((event) => event.slug),
        topicSlugs: topicsOf(events),
      });
    }
  }

  return questions;
}

/** Vòng "Đoán năm": mỗi ảnh tư liệu (không phải ảnh ngày nay) của một sự kiện có năm chắc chắn. */
export function buildYearRounds(data: QuizSourceData): YearRound[] {
  return data.events
    .filter((event) => YEAR_PRECISIONS.has(event.datePrecision))
    .flatMap((event) =>
      images(event.images, (item) => item.era === "historical").map((image) => ({
        id: `doan-nam:${image.id}`,
        image: toQuizImage(image),
        year: event.startYear,
        eventTitle: event.title,
        dateText: event.dateText,
        review: { href: eventHref(event.slug), label: event.title },
      })),
    );
}

/** Điểm một vòng "Đoán năm": đúng năm 100 điểm, mỗi năm lệch trừ 5 điểm (lệch từ 20 năm trở lên: 0). */
export function yearGuessPoints(guess: number, year: number): number {
  return Math.max(0, 100 - 5 * Math.abs(guess - year));
}

/** Xáo trộn (Fisher–Yates) với hàm ngẫu nhiên truyền vào — trình duyệt dùng Math.random, test dùng hàm cố định. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** Xáo thứ tự đáp án của một câu, giữ đúng vị trí đáp án đúng. */
export function shuffleChoices(question: QuizQuestion, random: () => number = Math.random): QuizQuestion {
  const order = shuffle(question.choices.map((_, index) => index), random);
  return {
    ...question,
    choices: order.map((index) => question.choices[index]),
    correctIndex: order.indexOf(question.correctIndex),
  };
}

/**
 * Một lượt chơi: xáo câu hỏi, lấy tối đa `size` câu, xáo đáp án từng câu. Ưu tiên không lặp lại cùng một ảnh trong
 * một lượt (câu "ảnh này là sự kiện nào?" và câu "sự kiện này năm nào?" có thể dùng chung ảnh bìa); chỉ khi không đủ
 * câu mới lấy thêm câu trùng ảnh.
 */
export function drawRound(pool: readonly QuizQuestion[], size: number, random: () => number = Math.random): QuizQuestion[] {
  const shuffled = shuffle(pool, random);
  const usedImages = new Set<string>();
  const picked: QuizQuestion[] = [];
  const repeats: QuizQuestion[] = [];
  for (const question of shuffled) {
    const url = question.image?.url;
    if (url && usedImages.has(url)) {
      repeats.push(question);
      continue;
    }
    if (url) usedImages.add(url);
    picked.push(question);
  }
  return [...picked, ...repeats].slice(0, size).map((question) => shuffleChoices(question, random));
}
