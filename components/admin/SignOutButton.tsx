import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/actions/auth";

/** Nút đăng xuất (Server Action) — dùng được cả ở layout nội bộ lẫn các trang thông báo trạng thái. */
export function SignOutButton({ variant = "secondary" }: { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant={variant} size="sm">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Đăng xuất
      </Button>
    </form>
  );
}
