"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * Hộp thoại của phòng thi (thẻ <dialog> gốc, showModal): giữ tiêu điểm bên trong, Esc / bấm nền để đóng — như
 * components/account/SignOutDialog.tsx. Nội dung chỉ dựng khi đang mở.
 */
export function RoomDialog({ open, onClose, title, children, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={
        className ??
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-border bg-surface p-0 text-surface-foreground shadow-2xl backdrop:bg-black/50"
      }
    >
      {open && (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <h2 id={titleId} className="font-serif text-xl font-bold text-foreground">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
