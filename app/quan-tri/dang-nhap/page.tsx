import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Card } from "@/components/ui/Card";
import { ADMIN_HOME } from "@/lib/admin/routes";
import { getStaffState } from "@/lib/auth";

export const metadata: Metadata = { title: "Đăng nhập nhân sự" };

/** Đăng nhập nhân sự (UC06). Đã đăng nhập hợp lệ thì vào thẳng khu vực nội bộ. */
export default async function LoginPage() {
  const state = await getStaffState();
  if (state.status === "active") redirect(ADMIN_HOME);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center font-serif text-xl font-bold text-foreground">
          Lịch sử <span className="text-accent">Việt Nam 12</span>
        </p>
        <Card className="p-6 sm:p-8">
          <h1 className="font-serif text-2xl font-bold text-foreground">Đăng nhập nhân sự</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Dành cho biên tập viên, kiểm duyệt viên và quản trị viên.
          </p>
          <LoginForm />
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground hover:underline">
            ← Về trang công khai
          </Link>
        </p>
      </div>
    </main>
  );
}
