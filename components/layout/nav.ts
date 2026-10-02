// Kiến trúc điều hướng mới (KE_HOACH_NANG_CAP_GIAO_DIEN.md, mục 5.1): 3 nhóm theo VIỆC CẦN LÀM — Học theo bài · Ôn tập ·
// Khám phá — cộng Tìm kiếm. Giữ nguyên URL cũ; mọi trang trước đây "ẩn" (bản đồ 3D, di tích gần em, Bạch Đằng…) đều có
// chỗ trong nhóm Khám phá. Dùng chung cho header, menu điện thoại, chân trang và trang /kham-pha.

import {
  BookOpen,
  Box,
  Compass,
  HelpCircle,
  History,
  ListChecks,
  Map as MapIcon,
  MapPin,
  Images,
  Route,
  Sparkles,
  Stamp,
  type LucideIcon,
} from "lucide-react";
import { lessonCatalog } from "@/lib/lessons/catalog";
import { quizPaths } from "@/lib/quiz/sets";
import { sgkPaths } from "@/lib/sgk/curriculum";

export type NavLink = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Nhãn phụ, ví dụ "Lớp 11". */
  badge?: string;
};

export type NavGroup = {
  id: "hoc" | "on-tap" | "kham-pha";
  label: string;
  /** Trang tổng của nhóm (thanh tab điện thoại, bấm tiêu đề nhóm). */
  href: string;
  icon: LucideIcon;
  /** Đường dẫn thuộc nhóm này (để tô sáng mục đang mở). */
  matches: string[];
  sections: { title: string; links: NavLink[] }[];
};

export const REVIEW_LINKS: NavLink[] = [
  { href: quizPaths.hub, label: "Trắc nghiệm theo bài", description: "10 câu có ảnh, chấm điểm ngay", icon: ListChecks },
  { href: quizPaths.all, label: "Trắc nghiệm tổng hợp", description: "Câu hỏi ngẫu nhiên cả chương trình", icon: ListChecks },
  { href: quizPaths.yearGame, label: "Nhìn ảnh đoán năm", description: "Ảnh tư liệu thật, đoán năm diễn ra", icon: Images },
  { href: "/ho-chieu", label: "Tiến độ học tập", description: "Hộ chiếu lịch sử: con dấu đã nhận", icon: Stamp },
];

export const EXPLORE_TOOLS: NavLink[] = [
  { href: "/dong-thoi-gian", label: "Dòng thời gian", description: "Các sự kiện theo trình tự, lọc theo chủ đề", icon: History },
  { href: "/ban-do", label: "Bản đồ lịch sử", description: "Sự kiện theo địa điểm trên bản đồ", icon: MapIcon },
  { href: "/di-tich-gan-em", label: "Di tích gần em", description: "Tìm di tích quanh nơi em ở", icon: MapPin },
  { href: "/tra-cuu", label: "Tra cứu", description: "Tìm sự kiện, nhân vật, địa điểm", icon: Compass },
];

export const FEATURE_LINKS: NavLink[] = lessonCatalog.map((lesson) => ({
  href: `/bai-hoc/${lesson.slug}`,
  label: lesson.title,
  description: `Chuyên đề tương tác · ${lesson.dateText}`,
  icon: Sparkles,
}));

export const MEDIA_LINKS: NavLink[] = [
  { href: "/ban-do-3d/dien-bien-phu", label: "Điện Biên Phủ trên bản đồ 3D", description: "Tư liệu 3D · địa hình thật", icon: Box },
  { href: "/kham-pha#tu-lieu-3d", label: "Phòng tư liệu 3D", description: "Hiện vật, di tích quét 3D xoay 360°", icon: Route },
];

export const EXTRA_LINKS: NavLink[] = [
  { href: "/tai-hien/bach-dang-938", label: "Chiến thắng Bạch Đằng 938", description: "Đọc thêm · ngoài chương trình lớp 12", icon: BookOpen, badge: "Lớp 11" },
  { href: "/huong-dan", label: "Hướng dẫn sử dụng", description: "Học theo bài, bản đồ, trắc nghiệm, tiến độ", icon: HelpCircle },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "hoc",
    label: "Học theo bài",
    href: sgkPaths.toc,
    icon: BookOpen,
    matches: ["/muc-luc", "/bai", "/chu-de", "/su-kien", "/nhan-vat", "/dia-diem"],
    // Phần "mục lục" của nhóm này vẽ riêng (MegaMenu) từ lib/sgk/curriculum.
    sections: [],
  },
  {
    id: "on-tap",
    label: "Ôn tập",
    href: quizPaths.hub,
    icon: ListChecks,
    matches: ["/trac-nghiem", "/ho-chieu"],
    sections: [{ title: "Ôn tập", links: REVIEW_LINKS }],
  },
  {
    id: "kham-pha",
    label: "Khám phá",
    href: "/kham-pha",
    icon: Compass,
    matches: ["/kham-pha", "/dong-thoi-gian", "/ban-do", "/di-tich-gan-em", "/tra-cuu", "/bai-hoc", "/ban-do-3d", "/phim-3d", "/mo-hinh-3d", "/tai-hien", "/huong-dan"],
    sections: [
      { title: "Công cụ", links: EXPLORE_TOOLS },
      { title: "Chuyên đề tương tác", links: FEATURE_LINKS },
      { title: "Tư liệu 3D", links: MEDIA_LINKS },
      { title: "Đọc thêm", links: EXTRA_LINKS },
    ],
  },
];

/** Nhóm đang mở theo đường dẫn (/ban-do-3d thuộc Khám phá chứ không thuộc /ban-do của nhóm khác). */
export function activeGroup(pathname: string): NavGroup["id"] | undefined {
  const matchesPath = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  return NAV_GROUPS.find((group) => group.matches.some(matchesPath))?.id;
}
