"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { FormMessage } from "@/components/admin/forms/Field";
import type { ActionState } from "@/lib/actions/state";

type Action = (previous: ActionState, formData: FormData) => Promise<ActionState>;
type Report = (result: ActionState | null) => void;

const ReportContext = createContext<Report | null>(null);

/**
 * Giữ thông báo kết quả của các thao tác bên trong ở một chỗ cố định (đầu khung).
 * Sau mỗi thao tác, trang được làm mới với dữ liệu mới nên nút vừa bấm có thể biến mất (gỡ thiết bị cuối cùng, đơn đã
 * hoàn tiền, câu hỏi vừa xóa…) — thông báo nằm trong nút sẽ mất theo. Khung này nằm ngoài các nút nên vẫn còn.
 * Cùng cách với AdminContentPanel.
 */
export function ActionNoticeScope({ children, className }: { children: ReactNode; className?: string }) {
  const [notice, setNotice] = useState<{ state: ActionState; id: number } | null>(null);
  const report = useCallback<Report>((result) => {
    setNotice(result && result.status !== "idle" && result.message ? { state: result, id: Date.now() } : null);
  }, []);

  return (
    <ReportContext.Provider value={report}>
      <div className={className}>
        {/* key mới mỗi lần → trình đọc màn hình đọc lại cả khi thông báo trùng lần trước. */}
        {notice && <FormMessage key={notice.id} state={notice.state} />}
        {children}
      </div>
    </ReportContext.Provider>
  );
}

/**
 * Bọc Server Action để báo kết quả lên ActionNoticeScope gần nhất. `scoped` = có khung nhận; khi đó nơi gọi không hiện
 * thông báo tại chỗ (tránh hiện hai lần). Không có khung thì trả nguyên action.
 */
export function useNoticeAction(action: Action): { action: Action; scoped: boolean } {
  const report = useContext(ReportContext);
  if (!report) return { action, scoped: false };
  return {
    scoped: true,
    action: async (previous, formData) => {
      report(null);
      const result = await action(previous, formData);
      report(result);
      return result;
    },
  };
}
