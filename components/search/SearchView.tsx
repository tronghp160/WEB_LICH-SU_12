"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import { DatePrecisionBadge } from "@/components/content/DatePrecisionBadge";
import { TopicBadge } from "@/components/content/TopicBadge";
import { Highlight } from "@/components/search/Highlight";
import { TopicFilter } from "@/components/timeline/TopicFilter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SearchIndex } from "@/lib/queries/search";
import { cn } from "@/lib/utils/cn";
import {
  SEARCH_KIND_PARAM,
  SEARCH_QUERY_PARAM,
  buildSearchUrl,
  matchesTokens,
  normalizeQuery,
  parseSearchKind,
  toTokens,
  type SearchKind,
} from "@/lib/utils/search";
import { formatLifespan } from "@/lib/utils/text";
import { TOPIC_FILTER_PARAM, parseTopicFilter, toggleTopic } from "@/lib/utils/timeline";

const DEBOUNCE_MS = 300;

const kindLabels: Record<SearchKind, string> = {
  "su-kien": "Sự kiện",
  "nhan-vat": "Nhân vật",
  "dia-diem": "Địa điểm",
};

type SearchViewProps = { index: SearchIndex };

/**
 * Tra cứu (UC04): tìm theo tên sự kiện / nhân vật (kể cả tên khác) / địa điểm (kể
 * cả tên lịch sử), KHÔNG phân biệt hoa thường và dấu, lọc theo chủ đề và loại.
 * Điều kiện nằm trên URL (`?q=&chu-de=&loai=`); gõ phím được debounce 300ms rồi mới
 * cập nhật URL bằng `history.replaceState`. Lọc chạy trong trình duyệt trên dữ liệu
 * đã tải nên không có request thừa và từ khóa không bao giờ chạm tới database.
 */
export function SearchView({ index }: SearchViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const knownTopics = index.topics.map((topic) => topic.slug);

  const query = normalizeQuery(searchParams.get(SEARCH_QUERY_PARAM));
  const topics = parseTopicFilter(searchParams.get(TOPIC_FILTER_PARAM), knownTopics);
  const kind = parseSearchKind(searchParams.get(SEARCH_KIND_PARAM));

  // Nội dung ô nhập tách khỏi `query` trên URL vì URL chỉ cập nhật sau khi ngừng gõ.
  const [inputValue, setInputValue] = useState(searchParams.get(SEARCH_QUERY_PARAM) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(next: { query: string; topics: string[]; kind: SearchKind | null }) {
    window.history.replaceState(null, "", buildSearchUrl(pathname, next));
  }

  function commitQuery(value: string) {
    // Đọc topic/loại từ URL hiện tại (không dùng biến đã "đóng băng" khi hẹn giờ).
    const current = new URLSearchParams(window.location.search);
    apply({
      query: value,
      topics: parseTopicFilter(current.get(TOPIC_FILTER_PARAM), knownTopics),
      kind: parseSearchKind(current.get(SEARCH_KIND_PARAM)),
    });
  }

  function onInput(value: string) {
    setInputValue(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commitQuery(value), DEBOUNCE_MS);
  }

  function clearAll() {
    if (timer.current) clearTimeout(timer.current);
    setInputValue("");
    apply({ query: "", topics: [], kind: null });
  }

  // --- Lọc ---
  const tokens = toTokens(query);
  const inTopics = (slugs: string[]) => topics.length === 0 || slugs.some((slug) => topics.includes(slug));

  const events = index.events.filter(
    (event) =>
      matchesTokens(event.title, tokens) &&
      (topics.length === 0 || (event.topicSlug !== undefined && topics.includes(event.topicSlug))),
  );
  const figures = index.figures.filter(
    (figure) =>
      (matchesTokens(figure.name, tokens) || matchesTokens(figure.otherNames, tokens)) &&
      inTopics(figure.topicSlugs),
  );
  const locations = index.locations.filter(
    (location) =>
      (matchesTokens(location.name, tokens) || matchesTokens(location.historicalName, tokens)) &&
      inTopics(location.topicSlugs),
  );

  const counts: Record<SearchKind, number> = {
    "su-kien": events.length,
    "nhan-vat": figures.length,
    "dia-diem": locations.length,
  };
  const total = events.length + figures.length + locations.length;
  const show = (target: SearchKind) => kind === null || kind === target;
  const shownCount = (["su-kien", "nhan-vat", "dia-diem"] as const).reduce(
    (sum, target) => sum + (show(target) ? counts[target] : 0),
    0,
  );
  const hasCondition = query !== "" || topics.length > 0 || kind !== null;

  return (
    <div className="flex flex-col gap-6">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (timer.current) clearTimeout(timer.current);
          commitQuery(inputValue);
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-surface p-1.5 shadow-card focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold"
      >
        <Search className="ml-3 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
        <label htmlFor="search-input" className="sr-only">
          Tìm sự kiện, nhân vật, địa điểm
        </label>
        <input
          id="search-input"
          type="search"
          value={inputValue}
          maxLength={100}
          autoComplete="off"
          placeholder="Tìm sự kiện, nhân vật, địa điểm — gõ có dấu hoặc không dấu"
          onChange={(event) => onInput(event.target.value)}
          className="h-10 min-w-0 flex-1 text-ellipsis bg-transparent pl-3 text-base text-surface-foreground placeholder:text-muted-foreground focus:outline-none sm:pl-0"
        />
        <Button type="submit">Tìm kiếm</Button>
      </form>

      <section aria-labelledby="loc-chu-de" className="flex flex-col gap-2">
        <h2 id="loc-chu-de" className="text-sm font-medium text-muted-foreground">
          Lọc theo chủ đề
        </h2>
        <TopicFilter
          topics={index.topics}
          selected={topics}
          onToggle={(slug) => apply({ query: inputValue, topics: toggleTopic(topics, slug), kind })}
          onClear={() => apply({ query: inputValue, topics: [], kind })}
        />
        {topics.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Nhân vật và địa điểm được lọc theo các sự kiện của chủ đề đã chọn.
          </p>
        )}
      </section>

      <div role="group" aria-label="Lọc theo loại nội dung" className="flex flex-wrap gap-2">
        {([null, "su-kien", "nhan-vat", "dia-diem"] as const).map((option) => {
          const active = kind === option;
          const label = option === null ? "Tất cả" : kindLabels[option];
          const count = option === null ? total : counts[option];
          return (
            <button
              key={option ?? "tat-ca"}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ query: inputValue, topics, kind: option })}
              className={cn(
                "min-h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface text-surface-foreground hover:bg-muted",
              )}
            >
              {label} <span className={active ? "opacity-80" : "text-muted-foreground"}>({count})</span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {query
          ? `Tìm thấy ${shownCount} kết quả cho “${query}”.`
          : hasCondition
            ? `${shownCount} kết quả theo bộ lọc.`
            : `Tất cả nội dung đã công bố (${shownCount}). Nhập từ khóa để thu hẹp.`}
      </p>

      {shownCount === 0 ? (
        <EmptyState
          title="Không tìm thấy kết quả"
          description="Thử từ khóa ngắn hơn, đổi cách viết (có dấu hoặc không dấu), hoặc bỏ bớt bộ lọc."
          action={
            <Button variant="secondary" onClick={clearAll}>
              Xóa điều kiện lọc
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-10">
          {show("su-kien") && events.length > 0 && (
            <section aria-labelledby="ket-qua-su-kien">
              <h2 id="ket-qua-su-kien" className="mb-4 font-serif text-2xl font-bold text-foreground">
                Sự kiện ({events.length})
              </h2>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {events.map((event) => (
                  <li key={event.slug}>
                    <Card className="relative flex h-full flex-col gap-2 p-4 transition-shadow hover:shadow-lg">
                      {event.topicName && (
                        <div className="flex items-center gap-2">
                          <TopicBadge name={event.topicName} slug={event.topicSlug} />
                          <DatePrecisionBadge precision={event.datePrecision} />
                        </div>
                      )}
                      <h3 className="text-balance font-serif text-lg font-semibold text-surface-foreground">
                        <Link
                          href={`/su-kien/${event.slug}`}
                          className="after:absolute after:inset-0 after:rounded-card after:content-[''] hover:text-accent focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-gold"
                        >
                          <Highlight text={event.title} tokens={tokens} />
                        </Link>
                      </h3>
                      <p className="text-sm font-medium text-gold-deep">{event.dateText}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{event.summary}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show("nhan-vat") && figures.length > 0 && (
            <section aria-labelledby="ket-qua-nhan-vat">
              <h2 id="ket-qua-nhan-vat" className="mb-4 font-serif text-2xl font-bold text-foreground">
                Nhân vật ({figures.length})
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {figures.map((figure) => {
                  const lifespan = formatLifespan(figure.birthYear, figure.deathYear);
                  return (
                    <li key={figure.slug}>
                      <Card className="relative flex h-full flex-col gap-1 p-4 transition-shadow hover:shadow-lg">
                        <h3 className="font-serif text-lg font-semibold text-surface-foreground">
                          <Link
                            href={`/nhan-vat/${figure.slug}`}
                            className="after:absolute after:inset-0 after:rounded-card after:content-[''] hover:text-accent focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-gold"
                          >
                            <Highlight text={figure.name} tokens={tokens} />
                          </Link>
                        </h3>
                        {lifespan && <p className="text-sm font-medium text-gold-deep">{lifespan}</p>}
                        {figure.otherNames && (
                          <p className="text-sm text-muted-foreground">
                            Còn gọi: <Highlight text={figure.otherNames} tokens={tokens} />
                          </p>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {show("dia-diem") && locations.length > 0 && (
            <section aria-labelledby="ket-qua-dia-diem">
              <h2 id="ket-qua-dia-diem" className="mb-4 font-serif text-2xl font-bold text-foreground">
                Địa điểm ({locations.length})
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {locations.map((location) => (
                  <li key={location.slug}>
                    <Card className="relative flex h-full flex-col gap-1 p-4 transition-shadow hover:shadow-lg">
                      <h3 className="font-serif text-lg font-semibold text-surface-foreground">
                        <Link
                          href={`/dia-diem/${location.slug}`}
                          className="after:absolute after:inset-0 after:rounded-card after:content-[''] hover:text-accent focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-gold"
                        >
                          <Highlight text={location.name} tokens={tokens} />
                        </Link>
                      </h3>
                      {location.historicalName && (
                        <p className="text-sm text-muted-foreground">
                          Tên lịch sử: <Highlight text={location.historicalName} tokens={tokens} />
                        </p>
                      )}
                      <div className="mt-1">
                        <AccuracyBadge level={location.accuracyLevel} />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
