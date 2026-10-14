"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Mã kích hoạt cỡ lớn + nút chép. */
export function LicenseCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Trình duyệt chặn clipboard: mã vẫn hiện để em tự chép.
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-gold bg-surface-raised p-5 text-center">
      <p className="text-sm font-medium text-muted-foreground">Mã kích hoạt của em</p>
      <p className="select-all whitespace-nowrap font-mono text-xl font-bold tracking-wide text-foreground sm:text-3xl sm:tracking-wider" data-testid="license-code">
        {code}
      </p>
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? "Đã chép" : "Chép mã"}
      </Button>
      <p role="status" className="sr-only">
        {copied ? "Đã chép mã kích hoạt" : ""}
      </p>
    </div>
  );
}
