"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, Menu, Search, Stamp, X } from "lucide-react";
import { ContinueLearningLink } from "@/components/layout/ContinueLearningLink";
import { activeGroup, NAV_GROUPS, type NavGroup, type NavLink } from "@/components/layout/nav";
import { openSearch, SearchOverlay } from "@/components/layout/SearchOverlay";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useProgress } from "@/lib/hooks/useProgress";
import { SGK_12, sgkPaths } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

/** Lối vào "Tiến độ học tập" (Hộ chiếu lịch sử) kèm số con dấu đã có trên máy này. */
function PassportLink({ active }: { active: boolean }) {
  const progress = useProgress();
  const stamps = progress ? Object.values(progress.quizzes).filter((record) => record.passedAt).length : 0;
  return (
    <Link
      href="/ho-chieu"
      aria-current={active ? "page" : undefined}
      aria-label={stamps > 0 ? `Hộ chiếu lịch sử: ${stamps} con dấu` : "Hộ chiếu lịch sử"}
      title="Tiến độ học tập (Hộ chiếu lịch sử)"
      className={cn(
        "relative inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
        active ? "text-accent" : "text-foreground",
      )}
    >
      <Stamp className="h-5 w-5" aria-hidden="true" />
      {stamps > 0 && (
        <span aria-hidden="true" className="min-w-5 rounded-full bg-accent px-1 text-center text-xs leading-5 text-accent-foreground">
          {stamps}
        </span>
      )}
    </Link>
  );
}

function LinkList({ links, onNavigate }: { links: NavLink[]; onNavigate: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {links.map(({ href, label, description, icon: Icon, badge }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            className="flex gap-3 rounded-lg p-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                {label}
                {badge && <span className="rounded-md bg-muted px-1.5 text-xs font-normal text-muted-foreground">{badge}</span>}
              </span>
              {description && <span className="block text-sm text-muted-foreground">{description}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Mục lục rút gọn trong menu "Học theo bài": 6 chủ đề, mỗi chủ đề liệt kê các bài. */
function SgkMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ContinueLearningLink onNavigate={onNavigate} />
        <Link href={sgkPaths.toc} onClick={onNavigate} className="text-sm font-medium text-accent hover:underline">
          Xem toàn bộ mục lục →
        </Link>
      </div>
      <ol className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {SGK_12.map((topic) => (
          <li key={topic.slug} data-topic-color={topic.color} className="border-l-4 border-[var(--topic)] pl-3">
            <Link
              href={sgkPaths.topic(topic.slug)}
              onClick={onNavigate}
              className="block text-xs font-semibold uppercase tracking-wide text-[var(--topic)] hover:underline"
            >
              Chủ đề {topic.number} · {topic.shortTitle}
            </Link>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {topic.lessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={sgkPaths.lesson(lesson.slug)}
                    onClick={onNavigate}
                    className="flex gap-2 rounded-md px-1.5 py-1 text-sm text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    <span className="w-12 shrink-0 font-semibold text-muted-foreground">Bài {lesson.number}</span>
                    <span>{lesson.shortTitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function GroupPanel({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  if (group.id === "hoc") return <SgkMenu onNavigate={onNavigate} />;
  return (
    <div className={cn("grid gap-6", group.sections.length > 1 ? "sm:grid-cols-2 lg:grid-cols-4" : "max-w-md")}>
      {group.sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
          <LinkList links={section.links} onNavigate={onNavigate} />
        </section>
      ))}
    </div>
  );
}

/**
 * Header 3 nhóm theo việc cần làm (mục 5.1): Học theo bài · Ôn tập · Khám phá, mỗi nhóm mở bảng menu lớn (desktop) hoặc
 * khối xếp dọc (điện thoại). Đóng bằng Esc, bấm ra ngoài, hoặc khi chuyển trang.
 */
export function Header() {
  const pathname = usePathname();
  const current = activeGroup(pathname);
  const [openGroup, setOpenGroup] = useState<NavGroup["id"] | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Chuyển trang → đóng mọi menu (đặt lại state ngay khi render, không cần effect).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenGroup(null);
    setIsMobileOpen(false);
  }

  useEffect(() => {
    if (!openGroup && !isMobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = openGroup ? document.getElementById(`nav-trigger-${openGroup}`) : null;
      setOpenGroup(null);
      setIsMobileOpen(false);
      trigger?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setOpenGroup(null);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openGroup, isMobileOpen]);

  const close = () => {
    setOpenGroup(null);
    setIsMobileOpen(false);
  };
  const openPanel = NAV_GROUPS.find((group) => group.id === openGroup);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-2 inline-flex shrink-0 items-center gap-2 font-serif text-lg font-bold text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <span>
            Lịch sử <span className="text-accent">12</span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_GROUPS.map((group) => {
              const expanded = openGroup === group.id;
              return (
                <li key={group.id}>
                  <button
                    id={`nav-trigger-${group.id}`}
                    type="button"
                    aria-expanded={expanded}
                    aria-controls="nav-mega-panel"
                    onClick={() => setOpenGroup(expanded ? null : group.id)}
                    className={cn(
                      "inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                      current === group.id || expanded ? "text-accent" : "text-foreground",
                    )}
                  >
                    {group.label}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={openSearch}
            aria-keyshortcuts="/ Control+K"
            title="Tìm kiếm (phím tắt /)"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm text-muted-foreground hover:border-border-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {/* Tên nút = đúng chữ hiển thị (trên màn hình hẹp chữ chỉ dành cho trình đọc màn hình). */}
            <span className="sr-only lg:not-sr-only">Tìm bài, sự kiện…</span>
            <kbd className="hidden rounded border border-border px-1.5 text-xs lg:inline" aria-hidden="true">
              /
            </kbd>
          </button>
          <PassportLink active={pathname === "/ho-chieu"} />
          <span className="hidden xl:block">
            <ThemeToggle />
          </span>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold md:hidden"
            aria-label={isMobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMobileOpen((open) => !open)}
          >
            {isMobileOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {openPanel && (
        <div id="nav-mega-panel" className="absolute inset-x-0 top-full hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-surface shadow-xl md:block">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <GroupPanel group={openPanel} onNavigate={close} />
          </div>
        </div>
      )}

      {isMobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Điều hướng chính (di động)"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-background md:hidden"
        >
          <div className="flex flex-col gap-6 px-4 py-4">
            {NAV_GROUPS.map((group) => (
              <section key={group.id}>
                <h2 className="mb-2 font-serif text-lg font-bold text-foreground">{group.label}</h2>
                <GroupPanel group={group} onNavigate={close} />
              </section>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Giao diện</span>
              <ThemeToggle />
            </div>
          </div>
        </nav>
      )}

      <SearchOverlay />
    </header>
  );
}
