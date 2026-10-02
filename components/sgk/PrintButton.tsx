"use client";

import { Printer } from "lucide-react";

/** In trang hiện tại (mục lục, khung bài) — CSS @media print trong globals.css ẩn menu và các nút. */
export function PrintButton({ label = "In trang này" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
