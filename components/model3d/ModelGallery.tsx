"use client";

import { useState } from "react";
import { ModelViewer } from "@/components/model3d/ModelViewer";
import { cn } from "@/lib/utils/cn";
import type { ModelSpec } from "@/lib/models3d/types";

type ModelGalleryProps = {
  specs: ModelSpec[];
  /** Nhãn của danh sách chọn (đọc bởi trình đọc màn hình). */
  label: string;
  debug?: boolean;
  className?: string;
};

/** Nhiều mô hình cùng chủ đề, chọn bằng thẻ; chỉ một khung WebGL hoạt động tại một thời điểm. */
export function ModelGallery({ specs, label, debug, className }: ModelGalleryProps) {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const spec = specs[index];
  if (!spec) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : specs.length - 1)) % specs.length;
    setIndex(next);
    document.getElementById(`model-tab-${specs[next].id}`)?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {specs.length > 1 && (
        <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-2 overflow-x-auto pb-1">
          {specs.map((item, i) => (
            <button
              key={item.id}
              id={`model-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-controls="model-panel"
              tabIndex={i === index ? 0 : -1}
              onClick={() => setIndex(i)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                i === index ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:bg-muted",
              )}
              data-testid="model-tab"
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
      <div id="model-panel" role={specs.length > 1 ? "tabpanel" : undefined} aria-labelledby={specs.length > 1 ? `model-tab-${spec.id}` : undefined}>
        <ModelViewer key={spec.id} spec={spec} autoStart={started} onStarted={() => setStarted(true)} debug={debug} />
      </div>
    </div>
  );
}
