"use client";

import { Lock } from "lucide-react";
import { useActionState } from "react";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { buyPackAction } from "@/lib/actions/payments";
import { initialActionState } from "@/lib/actions/state";

/** Form mua gói luyện thi. Giá hiển thị lấy từ server; form chỉ gửi slug sản phẩm + email (không bắt buộc). */
export function BuyPackForm({ productSlug, priceLabel }: { productSlug: string; priceLabel: string }) {
  const [state, formAction, pending] = useActionState(buyPackAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="product" value={productSlug} />
      <Field
        name="email"
        label="Email (không bắt buộc)"
        hint="Để tra cứu lại mã kích hoạt nếu em làm mất. Chỉ dùng cho việc này."
        error={errors.email}
      >
        {(props) => (
          <Input {...props} type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email ?? ""} placeholder="em@vidu.com" />
        )}
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
          <span>
            Em đồng ý mua gói cho mục đích học tập cá nhân. Nếu em dưới 18 tuổi, hãy hỏi ý kiến bố mẹ trước khi thanh toán.
          </span>
        </label>
        {errors.agree && (
          <p id="agree-error" className="text-sm text-accent">
            {errors.agree}
          </p>
        )}
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        <Lock className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang tạo đơn…" : `Thanh toán ${priceLabel}`}
      </Button>
    </form>
  );
}
