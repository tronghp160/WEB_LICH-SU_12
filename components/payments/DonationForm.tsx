"use client";

import { Heart } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { donateAction } from "@/lib/actions/payments";
import { initialActionState } from "@/lib/actions/state";
import { DONATION_PRESETS, formatVnd, parseVndInput } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils/cn";

type Props = { productSlug: string; minVnd: number; maxVnd: number };

/** Form ủng hộ: chọn nhanh mức tiền hoặc tự nhập; tên + lời nhắn không bắt buộc; mặc định KHÔNG hiện trên bức tường. */
export function DonationForm({ productSlug, minVnd, maxVnd }: Props) {
  const [state, formAction, pending] = useActionState(donateAction, initialActionState);
  const errors = state.fieldErrors ?? {};
  const [amount, setAmount] = useState(state.values?.amount ?? String(DONATION_PRESETS[1]));
  const [message, setMessage] = useState(state.values?.message ?? "");
  const parsed = parseVndInput(amount);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="product" value={productSlug} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-foreground">Số tiền ủng hộ</legend>
        <div className="flex flex-wrap gap-2">
          {DONATION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              aria-pressed={parsed === preset}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                parsed === preset ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:border-accent",
              )}
            >
              {formatVnd(preset)}
            </button>
          ))}
        </div>
        <Field
          name="amount"
          label="Hoặc nhập số khác (đồng)"
          hint={`Từ ${formatVnd(minVnd)} đến ${formatVnd(maxVnd)}.`}
          error={errors.amount}
        >
          {(props) => <Input {...props} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />}
        </Field>
      </fieldset>

      <Field name="displayName" label="Tên hiển thị (không bắt buộc)" error={errors.displayName}>
        {(props) => <Input {...props} maxLength={60} defaultValue={state.values?.displayName ?? ""} placeholder="Ví dụ: Lan, lớp 12A1" />}
      </Field>
      <Field name="message" label="Lời nhắn (không bắt buộc)" hint={`${message.length}/200 ký tự`} error={errors.message}>
        {(props) => <Textarea {...props} rows={3} maxLength={200} value={message} onChange={(event) => setMessage(event.target.value)} />}
      </Field>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="showOnWall" defaultChecked={state.values?.showOnWall === "on"} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>Hiện tên và lời nhắn trên Bức tường cảm ơn (sau khi được duyệt; không bao giờ hiện số tiền hay email).</span>
      </label>
      <Field name="email" label="Email (không bắt buộc)" hint="Chỉ để tra cứu lại đơn nếu cần." error={errors.email}>
        {(props) => <Input {...props} type="email" autoComplete="email" defaultValue={state.values?.email ?? ""} />}
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="agree"
            defaultChecked={state.values?.agree === "on"}
            aria-invalid={errors.agree ? true : undefined}
            aria-describedby={errors.agree ? "agree-error" : undefined}
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span>Em hiểu đây là khoản ủng hộ tự nguyện, không đổi lấy hàng hóa hay dịch vụ. Dưới 18 tuổi hãy hỏi ý kiến bố mẹ.</span>
        </label>
        {errors.agree && (
          <p id="agree-error" className="text-sm text-accent">
            {errors.agree}
          </p>
        )}
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        <Heart className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang tạo đơn…" : parsed ? `Ủng hộ ${formatVnd(parsed)}` : "Ủng hộ"}
      </Button>
    </form>
  );
}
