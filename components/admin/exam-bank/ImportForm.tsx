"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Textarea } from "@/components/ui/Textarea";
import { importExamBankAction, type ImportState } from "@/lib/actions/exam-bank";
import { IMPORT_MAX_ITEMS, examItemKindLabels } from "@/lib/exams/items";
import { cn } from "@/lib/utils/cn";

const initial: ImportState = { status: "idle" };
/** Giới hạn thân request của Server Action là 1 MB. */
const MAX_BYTES = 900_000;

/** Nhập câu hỏi từ tệp JSON: kiểm tra (không ghi) → xem lỗi từng dòng → ghi tất cả ở trạng thái nháp. */
export function ImportForm() {
  const [state, formAction, pending] = useActionState(importExamBankAction, initial);
  const [json, setJson] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const plan = state.plan;
  const tooBig = new Blob([json]).size > MAX_BYTES;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tep-json" className="text-sm font-medium text-foreground">
          Chọn tệp .json (hoặc dán nội dung vào ô bên dưới)
        </label>
        <input
          id="tep-json"
          type="file"
          accept=".json,application/json"
          className="text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            setFileError(null);
            if (!file) return;
            if (file.size > MAX_BYTES) {
              setFileError("Tệp lớn hơn 900 KB — chia nhỏ tệp.");
              return;
            }
            setJson(await file.text());
          }}
        />
        {fileError && <p className="text-sm text-accent">{fileError}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="noi-dung-json" className="text-sm font-medium text-foreground">
          Nội dung JSON
        </label>
        <Textarea id="noi-dung-json" name="json" rows={12} value={json} onChange={(event) => setJson(event.target.value)} className="font-mono text-xs" spellCheck={false} />
        <p className="text-xs text-muted-foreground">Tối đa {IMPORT_MAX_ITEMS} câu / tệp. Định dạng: docs/ke-hoach-luyen-thi.md, mục 7.2.</p>
        {tooBig && <p className="text-sm text-accent">Nội dung lớn hơn 900 KB — chia nhỏ tệp.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="mode" value="kiem-tra" variant="secondary" disabled={pending || json.trim() === "" || tooBig}>
          {pending ? "Đang kiểm tra…" : "Kiểm tra (chưa ghi)"}
        </Button>
        <Button type="submit" name="mode" value="ghi" disabled={pending || !plan?.ready || json.trim() === "" || tooBig}>
          Ghi vào ngân hàng
        </Button>
      </div>

      {state.status !== "idle" && state.message && (
        <Callout variant={state.status === "error" ? "warning" : "info"} title={state.status === "error" ? "Chưa ghi" : "Kết quả"}>
          {state.message}
        </Callout>
      )}

      {plan && (
        <div className="flex flex-col gap-3">
          {plan.fileErrors.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-accent">
              {plan.fileErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          {plan.passages.length > 0 && (
            <section aria-labelledby="ket-qua-tu-lieu">
              <h3 id="ket-qua-tu-lieu" className="mb-2 font-semibold text-foreground">
                Tư liệu ({plan.passages.length})
              </h3>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                {plan.passages.map((passage) => (
                  <li key={passage.key} className={cn("flex items-start gap-2", passage.errors.length ? "text-accent" : "text-foreground")}>
                    {passage.errors.length ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
                    <span>
                      <code>{passage.key}</code> {passage.input?.title}
                      {passage.errors.length > 0 && ` — ${passage.errors.join(" ")}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {plan.rows.length > 0 && (
            <section aria-labelledby="ket-qua-cau">
              <h3 id="ket-qua-cau" className="mb-2 font-semibold text-foreground">
                Câu hỏi ({plan.rows.length}) — lỗi {plan.rows.filter((row) => row.errors.length).length}
              </h3>
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                {plan.rows.map((row) => (
                  <li key={row.index} className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2">
                    <span className="flex items-start gap-2 text-foreground">
                      {row.errors.length ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
                      <span>
                        <strong>Câu {row.index}</strong>
                        {row.kind && ` · ${examItemKindLabels[row.kind]}`} — {row.stem.length > 100 ? `${row.stem.slice(0, 100)}…` : row.stem}
                      </span>
                    </span>
                    {row.errors.map((error) => (
                      <span key={error} className="pl-6 text-accent">
                        {error}
                      </span>
                    ))}
                    {[...row.warnings, ...(row.hints ?? [])].map((warning) => (
                      <span key={warning} className="flex items-start gap-1 pl-6 text-muted-foreground">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {warning}
                      </span>
                    ))}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </form>
  );
}
