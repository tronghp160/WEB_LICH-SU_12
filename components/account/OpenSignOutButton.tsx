"use client";

import { LogOut } from "lucide-react";
import { openSignOut } from "@/components/account/SignOutDialog";
import { Button } from "@/components/ui/Button";

/** Mở hộp thoại đăng xuất (gắn trong Header) từ trang Tài khoản. */
export function OpenSignOutButton() {
  return (
    <Button type="button" variant="secondary" onClick={openSignOut}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Đăng xuất
    </Button>
  );
}
