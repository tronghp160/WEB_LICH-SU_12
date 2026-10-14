import { AccountNav } from "@/components/account/AccountNav";

/**
 * Khung khu Tài khoản: cột giữa + menu con. KHÔNG kiểm đăng nhập ở đây — layout không chạy lại khi chuyển giữa các trang
 * con; mỗi trang tự gọi requireLearner() (và proxy.ts chặn sớm khi chưa có phiên).
 */
export default function AccountLayout({ children }: LayoutProps<"/tai-khoan">) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
      <AccountNav />
      {children}
    </div>
  );
}
