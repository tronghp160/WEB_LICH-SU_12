"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, CalendarDays, MapPin, Search, UserRound, X, type LucideIcon } from "lucide-react";
import { sgkPaths } from "@/lib/sgk/curriculum";
import { quickSearch, type QuickSearchIndex } from "@/lib/sgk/quick-search";
import { MAX_QUERY_LENGTH, normalizeQuery } from "@/lib/utils/search";

/** Sự kiện mở lớp phủ tìm kiếm (nút ở header, thanh tab điện thoại). */
export const OPEN_SEARCH_EVENT = "ls12:mo-tim-kiem";

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

const SUGGESTIONS = ["Điện Biên Phủ", "bài 7", "1975", "Võ Nguyên Giáp", "Hiệp định Paris"];

/** Chỉ mục tải một lần cho cả phiên (lần mở đầu tiên); lỗi mạng thì chỉ còn gợi ý Bài SGK (dữ liệu tĩnh). */
let indexPromise: Promise<QuickSearchIndex | null> | null = null;
function loadIndex(): Promise<QuickSearchIndex | null> {
  indexPromise ??= fetch("/api/tim-kiem")
    .then((response) => (response.ok ? (response.json() as Promise<QuickSearchIndex>) : null))
    .catch(() => null)
    .then((index) => {
      if (!index) indexPromise = null; // cho phép thử lại lần mở sau
      return index;
    });
  return indexPromise;
}

type ResultLink = { href: string; title: string; meta?: string };

function ResultGroup({ id, title, icon: Icon, items, onNavigate }: { id: string; title: string; icon: LucideIcon; items: ResultLink[]; onNavigate: () => void }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="mb-3">
      <h2 id={id} className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span className="min-w-0 flex-1">
                <span className="font-medium">{item.title}</span>
                {item.meta && <span className="ml-2 text-sm text-muted-foreground">{item.meta}</span>}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Đang gõ trong ô nhập liệu thì phím "/" là chữ, không phải phím tắt. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Lớp phủ tìm kiếm dùng ở mọi trang (mục 6.10): mở bằng phím "/" hoặc Ctrl/⌘ K. Gõ số hoặc tên bài thì gợi ý ngay
 * Bài SGK (dữ liệu tĩnh); Enter mở trang Tra cứu với từ khóa đó (sự kiện, nhân vật, địa điểm trong database).
 */
export function SearchOverlay() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<QuickSearchIndex | null>(null);

  useEffect(() => {
    const open = () => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      dialog.showModal();
      inputRef.current?.focus();
      void loadIndex().then(setIndex);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = (event.key === "k" || event.key === "K") && (event.ctrlKey || event.metaKey);
      if (shortcut || (event.key === "/" && !isTyping(event.target) && !event.altKey && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener(OPEN_SEARCH_EVENT, open);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, open);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const close = () => dialogRef.current?.close();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = normalizeQuery(query);
    if (!value) return;
    close();
    router.push(`/tra-cuu?q=${encodeURIComponent(value)}`);
  }

  const results = quickSearch(index, query);
  const hasResults = results.lessons.length + results.events.length + results.figures.length + results.locations.length > 0;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Tìm kiếm"
      onClick={(event) => {
        // Bấm ra ngoài khung (vùng nền mờ của <dialog>) thì đóng.
        if (event.target === dialogRef.current) close();
      }}
      onClose={() => setQuery("")}
      className="m-0 mx-auto mt-[10vh] w-[calc(100%-2rem)] max-w-xl rounded-card border border-border bg-surface p-0 text-surface-foreground shadow-2xl backdrop:bg-black/50"
    >
      <form role="search" onSubmit={submit} className="flex items-center gap-2 border-b border-border p-3">
        <Search className="ml-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="search-overlay-input" className="sr-only">
          Tìm bài, sự kiện, nhân vật, địa điểm
        </label>
        <input
          ref={inputRef}
          id="search-overlay-input"
          type="text"
          enterKeyHint="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          placeholder="Tìm bài, sự kiện, nhân vật…"
          className="h-10 min-w-0 flex-1 bg-transparent text-base placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="button"
          onClick={close}
          aria-label="Đóng tìm kiếm"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>

      <div className="max-h-[60vh] overflow-y-auto p-3">
        {results.lessons.length > 0 && (
          <section aria-labelledby="search-overlay-lessons" className="mb-3">
            <h2 id="search-overlay-lessons" className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Bài trong SGK
            </h2>
            <ul>
              {results.lessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={sgkPaths.lesson(lesson.slug)}
                    onClick={close}
                    data-topic-color={lesson.topic.color}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--topic)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">Bài {lesson.number}.</span> {lesson.shortTitle}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ResultGroup
          id="search-overlay-events"
          title="Sự kiện"
          icon={CalendarDays}
          onNavigate={close}
          items={results.events.map((item) => ({ href: `/su-kien/${item.slug}`, title: item.title, meta: item.dateText }))}
        />
        <ResultGroup
          id="search-overlay-figures"
          title="Nhân vật"
          icon={UserRound}
          onNavigate={close}
          items={results.figures.map((item) => ({ href: `/nhan-vat/${item.slug}`, title: item.name, meta: item.lifespan ?? undefined }))}
        />
        <ResultGroup
          id="search-overlay-locations"
          title="Địa điểm"
          icon={MapPin}
          onNavigate={close}
          items={results.locations.map((item) => ({ href: `/dia-diem/${item.slug}`, title: item.name, meta: item.historicalName ?? undefined }))}
        />
        {normalizeQuery(query) && !hasResults && index && (
          <p className="px-2 pb-2 text-sm text-muted-foreground">Không thấy kết quả khớp ngay. Thử tìm đầy đủ ở trang Tra cứu:</p>
        )}

        {normalizeQuery(query) ? (
          <button
            type="button"
            onClick={() => {
              close();
              router.push(`/tra-cuu?q=${encodeURIComponent(normalizeQuery(query))}`);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            <Search className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              Xem tất cả kết quả cho “<strong>{normalizeQuery(query)}</strong>” ở trang Tra cứu
            </span>
          </button>
        ) : (
          <div className="px-2">
            <p className="text-sm text-muted-foreground">Gợi ý:</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(item);
                      inputRef.current?.focus();
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Phím tắt: <kbd className="rounded border border-border px-1">/</kbd> hoặc{" "}
              <kbd className="rounded border border-border px-1">Ctrl</kbd> + <kbd className="rounded border border-border px-1">K</kbd> để mở,{" "}
              <kbd className="rounded border border-border px-1">Esc</kbd> để đóng. Gõ không dấu cũng được.
            </p>
          </div>
        )}
      </div>
    </dialog>
  );
}
