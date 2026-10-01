// Giao diện sáng/tối (KE_HOACH_NANG_CAP_GIAO_DIEN.md, mục 7.1): người dùng chọn Sáng / Tối / Theo hệ thống, lưu trong
// localStorage; <html data-theme="light|dark"> luôn là giá trị ĐÃ QUY ĐỔI (hệ thống → sáng hoặc tối) để CSS chỉ cần
// đọc một thuộc tính. Script dưới đây chạy trong <head> trước khi vẽ trang để không nháy màu
// (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md).

export type ThemePreference = "light" | "dark" | "system";

export const THEME_KEY = "ls12:giao-dien";
export const THEME_CHANGE_EVENT = "ls12:giao-dien-doi";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Đặt data-theme theo lựa chọn đã lưu; khi "theo hệ thống" thì đổi theo hệ điều hành cả lúc trang đang mở.
 * Viết bằng ES5 vì chạy trước mọi đoạn mã khác.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var p;try{p=localStorage.getItem("${THEME_KEY}")}catch(e){}if(p!=="light"&&p!=="dark")p=m.matches?"dark":"light";d.setAttribute("data-theme",p)}a();m.addEventListener("change",a);window.addEventListener("${THEME_CHANGE_EVENT}",a);window.addEventListener("storage",function(e){if(e.key==="${THEME_KEY}")a()})}catch(e){}})()`;
