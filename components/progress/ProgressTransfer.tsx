"use client";

import { useState } from "react";
import { ClipboardCopy, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { importProgress, useProgress } from "@/lib/hooks/useProgress";
import { exportProgressCode, importProgressCode } from "@/lib/progress/progress";

/**
 * Chuyển tiến độ sang máy khác (mục 6.7): tạo mã (chuỗi chữ) để chép, dán mã ở máy kia để GỘP vào tiến độ đang có —
 * không ghi đè, không gửi gì lên máy chủ.
 */
export function ProgressTransfer() {
  const progress = useProgress();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!progress) return null;

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function applyCode() {
    const incoming = importProgressCode(input);
    if (!incoming) {
      setMessage({ ok: false, text: "Mã không đúng hoặc bị thiếu ký tự. Em chép lại toàn bộ mã (bắt đầu bằng LS12-) rồi thử lại." });
      return;
    }
    importProgress(incoming);
    setInput("");
    setMessage({ ok: true, text: "Đã gộp tiến độ từ máy kia vào máy này." });
  }

  return (
    <section aria-labelledby="chuyen-may" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 id="chuyen-may" className="font-serif text-lg font-bold text-foreground">
        Chuyển tiến độ sang máy khác
      </h2>
      <p className="text-sm text-muted-foreground">
        Học ở máy trường rồi về học tiếp trên điện thoại? Tạo mã ở máy này, gửi cho chính em (tin nhắn, ghi chú), rồi dán mã ở máy kia. Tiến độ hai
        máy được gộp lại (giữ điểm cao nhất), không mất gì.
      </p>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" className="self-start" onClick={() => {
          setCode(exportProgressCode(progress));
          setCopied(false);
        }}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Tạo mã tiến độ
        </Button>
        {code && (
          <div className="flex flex-col gap-2">
            <label htmlFor="ma-tien-do" className="text-sm font-medium text-foreground">
              Mã tiến độ của máy này
            </label>
            <textarea
              id="ma-tien-do"
              readOnly
              value={code}
              rows={3}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full break-all rounded-lg border border-border bg-sunken p-2 font-mono text-xs text-foreground"
            />
            <Button variant="ghost" size="sm" className="self-start" onClick={() => copy(code)}>
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Đã chép" : "Chép mã"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <label htmlFor="nhap-ma-tien-do" className="text-sm font-medium text-foreground">
          Dán mã từ máy khác
        </label>
        <textarea
          id="nhap-ma-tien-do"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setMessage(null);
          }}
          rows={3}
          placeholder="LS12-…"
          className="w-full break-all rounded-lg border border-border bg-surface p-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline focus:outline-2 focus:outline-gold"
        />
        <Button variant="secondary" size="sm" className="self-start" onClick={applyCode} disabled={!input.trim()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Gộp vào máy này
        </Button>
        {message && (
          <p role="status" className={message.ok ? "text-sm text-success" : "text-sm text-accent"}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
