"use client";

import { useEffect, useState } from "react";

/** Thanh tiến độ đọc bài ở mép trên màn hình (trang trí, trình đọc màn hình bỏ qua). */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const update = () => {
      frameId = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!frameId) frameId = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1" aria-hidden="true">
      <div className="h-full origin-left bg-accent" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
