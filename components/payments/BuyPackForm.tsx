"use client";

import { Lock } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, FormMessage } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { buyPackAction } from "@/lib/actions/payments";
import { initialActionState } from "@/lib/actions/state";
import { useSession } from "@/lib/hooks/useSession";

export type PlanOption = { slug: string; label: string; priceLabel: string; note: string; badge?: string };

/**
 * Form mua gói luyện thi: chọn gói tháng / năm. Giá hiển thị lấy từ server; form chỉ gửi slug sản phẩm + email (không
 * bắt buộc) — số tiền server tự tính. Đang đăng nhập thì gói gắn với tài khoản (server lấy user id từ phiên) và email để
 * trống sẽ dùng email tài khoản.
 */
export function BuyPackForm({ plans }: { plans: PlanOption[] }) {
  const [state, formAction, pending] = useActionState(buyPackAction, initialActionState);
  const errors = state.fieldErrors ?? {};
  const session = useSession();
  // Mặc định chọn gói cuối (gói năm — lợi hơn).
  const [selected, setSelected] = useState(plans.at(-1)?.slug ?? "");
  const current = plans.find((plan) => plan.slug === selected) ?? plans[0];

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2" data-testid="plan-options">
        <legend className="mb-1 text-sm font-semibold text-foreground">Chọn gói</legend>
        {plans.map((plan) => (
          <label
            key={plan.slug}
            className={`flex cursor-pointer items-start gap-3 rounded-card border p-3 ${plan.slug === current?.slug ? "border-accent bg-accent/5" : "border-border bg-surface"}`}
          >
            <input
              type="radio"
              name="product"
              value={plan.slug}
              checked={plan.slug === current?.slug}
              onChange={() => setSelected(plan.slug)}
              className="mt-1 h-4 w-4 accent-[var(--accent)]"
            />
            <span className="flex flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                {plan.label}
                {plan.badge && <span className="rounded-full bg-gold-deep/15 px-2 py-0.5 text-xs font-semibold text-gold-deep">{plan.badge}</span>}
              </span>
              <span className="text-xl font-bold text-foreground">{plan.priceLabel}</span>
              <span className="text-sm text-muted-foreground">{plan.note}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Field
        name="email"
        label="Email (không bắt buộc)"
        hint={
          session.status === "signed-in"
            ? `Để trống thì dùng email tài khoản (${session.email}). Chỉ dùng để gửi và tra cứu lại mã kích hoạt.`
            : "Để tra cứu lại mã kích hoạt nếu em làm mất. Chỉ dùng cho việc này."
        }
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
      {session.status === "signed-in" && (
        <p className="text-sm text-foreground" data-testid="mua-gan-tai-khoan">
          Gói sẽ gắn với tài khoản <strong>{session.name}</strong> — đăng nhập ở máy nào cũng làm được đề.
        </p>
      )}
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        <Lock className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang tạo đơn…" : `Thanh toán ${current?.priceLabel ?? ""}`}
      </Button>
    </form>
  );
}
