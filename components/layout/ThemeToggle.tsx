"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { isThemePreference, THEME_CHANGE_EVENT, THEME_KEY, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
];

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
  document.documentElement.setAttribute("data-theme", resolved);
}

/**
 * Chọn giao diện Sáng / Tối / Theo hệ thống (nhóm 3 nút, bấm bằng chuột hoặc bàn phím). Script trong <head>
 * (lib/theme.ts) đã đặt màu trước khi vẽ trang; component này chỉ lưu lựa chọn mới.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useSyncExternalStore(subscribe, readPreference, () => null);

  // Chế độ dev (Strict Mode) dựng lại <html> và xóa thuộc tính script đã đặt → đặt lại trước khi vẽ. Bản build: không đổi gì.
  useLayoutEffect(() => {
    applyTheme(readPreference());
  }, []);

  function choose(value: ThemePreference) {
    try {
      window.localStorage.setItem(THEME_KEY, value);
    } catch {
      // Trình duyệt chặn lưu trữ: vẫn đổi màu cho lần xem này.
    }
    applyTheme(value);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <div role="group" aria-label="Giao diện" className={cn("inline-flex rounded-full border border-border bg-surface p-0.5", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={`Giao diện: ${label}`}
            title={label}
            onClick={() => choose(value)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
