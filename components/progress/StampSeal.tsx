import { useId } from "react";
import type { StampKind } from "@/lib/progress/progress";
import { hashString } from "@/lib/quiz/generate";
import { cn } from "@/lib/utils/cn";

/** Màu mực theo loại dấu: bài học đỏ, chủ đề vàng đồng, bộ đặc biệt xanh. Dùng biến màu nên tự đổi theo dark mode. */
const INK: Record<StampKind, string> = {
  lesson: "text-accent",
  topic: "text-gold-deep",
  special: "text-success",
};

const RING_TEXT = "HỘ CHIẾU LỊCH SỬ ★ VIỆT NAM 12 ★ ";

type StampSealProps = {
  id: string;
  kind: StampKind;
  motto: string;
  date: string;
  className?: string;
};

/**
 * Con dấu tròn cách điệu (vẽ bằng SVG, không dùng ảnh): vòng chữ "Hộ chiếu lịch sử", mốc thời gian ở giữa, ngày
 * nhận dấu bên dưới. Mỗi dấu nghiêng một góc cố định theo `id` cho giống dấu đóng tay.
 */
export function StampSeal({ id, kind, motto, date, className }: StampSealProps) {
  const pathId = `stamp-ring-${useId().replace(/:/g, "")}`;
  const tilt = (hashString(id) % 17) - 8;
  const mottoSize = motto.length <= 6 ? 15 : motto.length <= 11 ? 11.5 : 9;

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("stamp-seal", INK[kind], className)}
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <defs>
        <path id={pathId} d="M60,60 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0" />
      </defs>
      <circle cx="60" cy="60" r="56" strokeWidth="3" />
      <circle cx="60" cy="60" r="51" strokeWidth="1" />
      <circle cx="60" cy="60" r="35" strokeWidth="1" />
      <text fill="currentColor" stroke="none" fontSize="8.5" fontWeight="700" letterSpacing="0.5">
        <textPath href={`#${pathId}`} textLength="266" lengthAdjust="spacing">
          {RING_TEXT}
        </textPath>
      </text>
      <path
        d="M60 36 l2.6 5.3 5.8 0.8 -4.2 4.1 1 5.8 -5.2 -2.7 -5.2 2.7 1 -5.8 -4.2 -4.1 5.8 -0.8z"
        fill="currentColor"
        stroke="none"
      />
      <text x="60" y="68" textAnchor="middle" fill="currentColor" stroke="none" fontSize={mottoSize} fontWeight="800" className="font-serif">
        {motto}
      </text>
      <text x="60" y="82" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7.5" fontWeight="600">
        {date}
      </text>
    </svg>
  );
}
