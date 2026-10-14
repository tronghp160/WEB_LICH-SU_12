"use client";

import { CheckCircle2, KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { activateLicenseAction } from "@/lib/actions/payments";
import { examPaths } from "@/lib/exams/exam";
import { getDeviceId, saveLicense } from "@/lib/hooks/useLicense";

type Props = {
  /** Mã có sẵn (trang kết quả thanh toán) → chỉ hiện nút "Kích hoạt trên máy này". */
  presetCode?: string;
};

/** Nhập / kích hoạt mã gói luyện thi trên trình duyệt này. */
export function ActivateLicenseForm({ presetCode }: Props) {
  const [code, setCode] = useState(presetCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ devicesUsed: number; maxDevices: number; persisted: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (code.trim() === "") {
      setError("Em hãy nhập mã kích hoạt.");
      return;
    }
    startTransition(async () => {
      const result = await activateLicenseAction(code, getDeviceId());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const persisted = saveLicense({
        code: result.code,
        productSlug: result.productSlug,
        validUntil: result.validUntil,
        activatedAt: new Date().toISOString(),
        devicesUsed: result.devicesUsed,
        maxDevices: result.maxDevices,
      });
      setDone({ devicesUsed: result.devicesUsed, maxDevices: result.maxDevices, persisted });
    });
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-success bg-success/10 p-4" role="status">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
          Đã kích hoạt gói luyện thi trên máy này ({done.devicesUsed}/{done.maxDevices} thiết bị).
        </p>
        {!done.persisted && (
          <p className="text-sm text-foreground">
            Trình duyệt này không cho lưu dữ liệu, nên khi đóng trang em sẽ phải nhập lại mã. Hãy giữ mã cẩn thận.
          </p>
        )}
        <div>
          <LinkButton href={examPaths.hub}>Vào làm đề</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      {presetCode ? (
        <input type="hidden" name="code" value={code} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="license-code" className="text-sm font-medium text-foreground">
            Mã kích hoạt
          </label>
          <Input
            id="license-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="LT12-XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "license-error" : "license-hint"}
            className="font-mono text-base tracking-wider"
          />
          <p id="license-hint" className="text-xs text-muted-foreground">
            Không phân biệt chữ hoa/thường; có hay không có dấu gạch đều được.
          </p>
        </div>
      )}
      {error && (
        <p id="license-error" role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {pending ? "Đang kích hoạt…" : presetCode ? "Kích hoạt trên máy này" : "Kích hoạt"}
        </Button>
      </div>
    </form>
  );
}
