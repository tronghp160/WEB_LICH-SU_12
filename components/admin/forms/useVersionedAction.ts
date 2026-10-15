"use client";

import { useActionState } from "react";
import { initialActionState, type ActionState } from "@/lib/actions/state";

type Action = (previous: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * useActionState + số lần server đã trả kết quả. React đặt lại form sau mỗi lần gửi, nhưng `<select defaultValue>` và
 * radio `defaultChecked` KHÔNG theo giá trị mặc định mới → sau một lần lỗi, các ô chọn bị trống. Đặt `key={version}` cho
 * phần ô nhập để dựng lại theo giá trị vừa gửi (state.values).
 */
export function useVersionedAction(action: Action) {
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState & { version: number }, formData: FormData) => ({ ...(await action(previous, formData)), version: previous.version + 1 }),
    { ...initialActionState, version: 0 },
  );
  return [state, formAction, pending] as const;
}
