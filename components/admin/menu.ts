import { BookOpen, ClipboardCheck, FileText, LayoutDashboard, Users, Activity, type LucideIcon } from "lucide-react";
import { STAFF_ROLES, type StaffRole } from "@/lib/utils/labels";

export type AdminMenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Vai trò được thấy mục này. CHỈ để ẩn/hiện menu — quyền thật do requireRole() và RLS quyết định. */
  roles: readonly StaffRole[];
  description: string;
};

export const ADMIN_MENU: readonly AdminMenuItem[] = [
  {
    label: "Tổng quan",
    href: "/quan-tri",
    icon: LayoutDashboard,
    roles: STAFF_ROLES,
    description: "Trang chính của khu vực nội bộ.",
  },
  {
    label: "Nội dung",
    href: "/quan-tri/noi-dung",
    icon: FileText,
    roles: ["editor", "system_admin"],
    description: "Tạo, chỉnh sửa chủ đề, sự kiện, nhân vật, địa điểm, nguồn và media.",
  },
  {
    label: "Bài SGK",
    href: "/quan-tri/bai-sgk",
    icon: BookOpen,
    roles: ["editor", "reviewer", "system_admin"],
    description: "Gán sự kiện vào từng bài, từng mục của SGK Lịch sử 12.",
  },
  {
    label: "Kiểm duyệt",
    href: "/quan-tri/kiem-duyet",
    icon: ClipboardCheck,
    roles: ["reviewer", "system_admin"],
    description: "Hàng đợi chờ duyệt: duyệt, yêu cầu chỉnh sửa, công bố hoặc ẩn.",
  },
  {
    label: "Nhân sự",
    href: "/quan-tri/nhan-su",
    icon: Users,
    roles: ["system_admin"],
    description: "Tạo tài khoản, đổi vai trò, khóa hoặc mở khóa nhân sự.",
  },
  {
    label: "Vận hành",
    href: "/quan-tri/van-hanh",
    icon: Activity,
    roles: ["system_admin"],
    description: "Thống kê nội dung, kiểm tra toàn vẹn dữ liệu và tình trạng hệ thống.",
  },
];

export const roleDescriptions: Record<StaffRole, string> = {
  editor: "Bạn tạo và chỉnh sửa nội dung nháp, quản lý nguồn và media, rồi gửi kiểm duyệt. Bạn không tự công bố nội dung.",
  reviewer: "Bạn xem hàng đợi kiểm duyệt, yêu cầu chỉnh sửa, duyệt và công bố hoặc ẩn nội dung.",
  system_admin: "Bạn quản lý nhân sự và vai trò, có toàn quyền với nội dung và theo dõi vận hành hệ thống.",
};

export function menuForRole(role: StaffRole): AdminMenuItem[] {
  return ADMIN_MENU.filter((item) => item.roles.includes(role));
}
