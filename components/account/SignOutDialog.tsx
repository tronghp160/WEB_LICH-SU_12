"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { signOutLearnerAction } from "@/lib/actions/account";
import { clearLicense } from "@/lib/hooks/useLicense";
import { clearProgress } from "@/lib/hooks/useProgress";
import { markSignedOut } from "@/lib/hooks/useSession";

/** Sự kiện mở hộp thoại đăng xuất (menu tài khoản trên Header, menu điện thoại, trang Tài khoản). */
export const OPEN_SIGN_OUT_EVENT = "ls12:mo-dang-xuat";

export function openSignOut() {
  window.dispatchEvent(new Event(OPEN_SIGN_OUT_EVENT));
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </Button>
  );
}

/**
 * Hộp thoại đăng xuất (mục 6.5) — một bản duy nhất gắn trong Header (luôn tồn tại, không mất khi menu đóng), mở bằng
 * `openSignOut()`. Ô "máy dùng chung": tích thì xóa tiến độ và mã kích hoạt lưu trên máy này (localStorage — chỉ client
 * xóa được) ngay trước khi gửi form đăng xuất.
 */
export function SignOutDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      dialog.showModal();
    };
    window.addEventListener(OPEN_SIGN_OUT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SIGN_OUT_EVENT, onOpen);
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="dang-xuat-tieu-de"
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      onClose={() => setShared(false)}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-surface p-0 text-surface-foreground shadow-2xl backdrop:bg-black/50"
    >
      <form
        action={signOutLearnerAction}
        onSubmit={() => {
          if (shared) {
            clearProgress();
            clearLicense();
          }
          markSignedOut();
        }}
        className="flex flex-col gap-4 p-5 sm:p-6"
      >
        <h2 id="dang-xuat-tieu-de" className="font-serif text-xl font-bold text-foreground">
          Đăng xuất?
        </h2>
        <div className="flex items-start gap-3 text-sm text-foreground">
          <input
            id="dang-xuat-may-chung"
            type="checkbox"
            name="shared"
            checked={shared}
            onChange={(event) => setShared(event.target.checked)}
            aria-describedby="dang-xuat-may-chung-mo-ta"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <div>
            <label htmlFor="dang-xuat-may-chung" className="font-medium">
              Đây là máy dùng chung (máy trường)
            </label>
            <p id="dang-xuat-may-chung-mo-ta" className="mt-1 text-muted-foreground">
              Xóa tiến độ và mã đã lưu trên máy này. Muốn giữ tiến độ, hãy chép mã tiến độ ở trang Hộ chiếu trước; mã gói
              luyện thi nhập lại được bất cứ lúc nào.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Ở lại
          </Button>
          <SubmitButton />
        </div>
      </form>
    </dialog>
  );
}
