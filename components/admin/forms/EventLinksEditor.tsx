"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Option } from "@/lib/queries/admin-content";
import { workflowStatusLabels } from "@/lib/utils/labels";

export type EventLinksValue = {
  figures: { figure_id: string; relationship: string }[];
  locations: { location_id: string; location_role: string; is_primary: boolean }[];
  sources: { source_id: string; source_note: string; confidence_note: string }[];
  /** Chủ đề phụ (id). */
  topics: string[];
};

type EventLinksEditorProps = {
  options: { figures: Option[]; locations: Option[]; sources: Option[]; topics: Option[] };
  initial: EventLinksValue;
  disabled?: boolean;
};

function optionLabel(option: Option): string {
  // Nội dung chưa công bố vẫn gắn được, nhưng người dùng cần biết nó sẽ chưa hiện ở trang công khai.
  return option.status && option.status !== "published"
    ? `${option.label} (${workflowStatusLabels[option.status]})`
    : option.label;
}

/** Chọn một mục chưa được gắn từ danh sách rồi bấm "Thêm". */
function AddPicker({
  label,
  options,
  usedIds,
  onAdd,
  disabled,
}: {
  label: string;
  options: Option[];
  usedIds: Set<string>;
  onAdd: (id: string) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState("");
  const available = options.filter((option) => !usedIds.has(option.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label={label}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        disabled={disabled || available.length === 0}
        className="min-w-0 flex-1 sm:max-w-sm"
      >
        <option value="">{available.length === 0 ? "Đã gắn hết / chưa có mục nào" : `— ${label} —`}</option>
        {available.map((option) => (
          <option key={option.id} value={option.id}>
            {optionLabel(option)}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled={disabled || selected === ""}
        onClick={() => {
          onAdd(selected);
          setSelected("");
        }}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Thêm
      </Button>
    </div>
  );
}

function RemoveButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

const rowClass = "flex flex-col gap-2 rounded-lg border border-border bg-surface p-3";

/**
 * Trình soạn liên kết của sự kiện: nhân vật (kèm quan hệ), địa điểm (kèm vai trò, chọn 1 địa điểm
 * chính) và nguồn (kèm ghi chú). Toàn bộ trạng thái được gửi lên dưới dạng JSON trong ô ẩn `links`
 * và được Zod kiểm tra lại ở server.
 */
export function EventLinksEditor({ options, initial, disabled }: EventLinksEditorProps) {
  const [figures, setFigures] = useState(initial.figures);
  const [locations, setLocations] = useState(initial.locations);
  const [sources, setSources] = useState(initial.sources);
  const [topics, setTopics] = useState(initial.topics);

  const nameOf = (list: Option[], id: string) => {
    const option = list.find((item) => item.id === id);
    return option ? optionLabel(option) : "(không còn tồn tại)";
  };

  const payload: EventLinksValue = { figures, locations, sources, topics };

  return (
    <div className="flex flex-col gap-8">
      <input type="hidden" name="links" value={JSON.stringify(payload)} />

      {/* ---- Chủ đề phụ ---- */}
      <fieldset disabled={disabled} className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 font-serif text-lg font-semibold text-foreground">Chủ đề phụ</legend>
        <p className="text-sm text-muted-foreground">
          Sự kiện sẽ hiện thêm ở các chủ đề này (ví dụ Hiệp định Genève còn thuộc “Lịch sử đối ngoại”). Chủ đề chính chọn ở trên.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {options.topics.map((topic) => (
            <label key={topic.id} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={topics.includes(topic.id)}
                onChange={(event) =>
                  setTopics(event.target.checked ? [...topics, topic.id] : topics.filter((id) => id !== topic.id))
                }
              />
              {optionLabel(topic)}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ---- Nhân vật ---- */}
      <section aria-labelledby="lien-ket-nhan-vat" className="flex flex-col gap-3">
        <h3 id="lien-ket-nhan-vat" className="font-serif text-lg font-semibold text-foreground">
          Nhân vật liên quan
        </h3>
        <ul className="flex flex-col gap-2">
          {figures.map((link, index) => (
            <li key={link.figure_id} className={rowClass}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-surface-foreground">
                  {nameOf(options.figures, link.figure_id)}
                </span>
                <RemoveButton
                  label={`Gỡ nhân vật ${nameOf(options.figures, link.figure_id)}`}
                  disabled={disabled}
                  onClick={() => setFigures(figures.filter((_, i) => i !== index))}
                />
              </div>
              <Input
                aria-label={`Quan hệ của ${nameOf(options.figures, link.figure_id)} với sự kiện`}
                placeholder="Quan hệ với sự kiện, ví dụ: Tổng Tư lệnh"
                value={link.relationship}
                maxLength={500}
                onChange={(event) =>
                  setFigures(figures.map((item, i) => (i === index ? { ...item, relationship: event.target.value } : item)))
                }
              />
            </li>
          ))}
        </ul>
        <AddPicker
          label="Chọn nhân vật"
          options={options.figures}
          usedIds={new Set(figures.map((item) => item.figure_id))}
          disabled={disabled}
          onAdd={(id) => setFigures([...figures, { figure_id: id, relationship: "" }])}
        />
      </section>

      {/* ---- Địa điểm ---- */}
      <section aria-labelledby="lien-ket-dia-diem" className="flex flex-col gap-3">
        <h3 id="lien-ket-dia-diem" className="font-serif text-lg font-semibold text-foreground">
          Địa điểm
        </h3>
        <p className="text-sm text-muted-foreground">
          Chọn một địa điểm chính (dùng để bay tới trên bản đồ); các địa điểm còn lại là địa điểm phụ.
        </p>
        <ul className="flex flex-col gap-2">
          {locations.map((link, index) => (
            <li key={link.location_id} className={rowClass}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-surface-foreground">
                  {nameOf(options.locations, link.location_id)}
                </span>
                <RemoveButton
                  label={`Gỡ địa điểm ${nameOf(options.locations, link.location_id)}`}
                  disabled={disabled}
                  onClick={() => setLocations(locations.filter((_, i) => i !== index))}
                />
              </div>
              <Input
                aria-label={`Vai trò của ${nameOf(options.locations, link.location_id)} trong sự kiện`}
                placeholder="Vai trò, ví dụ: Nơi diễn ra"
                value={link.location_role}
                maxLength={500}
                onChange={(event) =>
                  setLocations(locations.map((item, i) => (i === index ? { ...item, location_role: event.target.value } : item)))
                }
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={link.is_primary}
                  disabled={disabled}
                  // Chỉ một địa điểm chính: chọn địa điểm này thì các địa điểm khác tự bỏ cờ.
                  onChange={(event) =>
                    setLocations(
                      locations.map((item, i) => ({
                        ...item,
                        is_primary: i === index ? event.target.checked : event.target.checked ? false : item.is_primary,
                      })),
                    )
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Địa điểm chính
              </label>
            </li>
          ))}
        </ul>
        <AddPicker
          label="Chọn địa điểm"
          options={options.locations}
          usedIds={new Set(locations.map((item) => item.location_id))}
          disabled={disabled}
          onAdd={(id) =>
            setLocations([...locations, { location_id: id, location_role: "", is_primary: locations.length === 0 }])
          }
        />
      </section>

      {/* ---- Nguồn ---- */}
      <section aria-labelledby="lien-ket-nguon" className="flex flex-col gap-3">
        <h3 id="lien-ket-nguon" className="font-serif text-lg font-semibold text-foreground">
          Nguồn tham khảo <span className="text-sm font-normal text-accent">(bắt buộc ít nhất 1 để gửi duyệt)</span>
        </h3>
        <ul className="flex flex-col gap-2">
          {sources.map((link, index) => (
            <li key={link.source_id} className={rowClass}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-surface-foreground">
                  {nameOf(options.sources, link.source_id)}
                </span>
                <RemoveButton
                  label={`Gỡ nguồn ${nameOf(options.sources, link.source_id)}`}
                  disabled={disabled}
                  onClick={() => setSources(sources.filter((_, i) => i !== index))}
                />
              </div>
              <Input
                aria-label={`Ghi chú về nguồn ${nameOf(options.sources, link.source_id)}`}
                placeholder="Ghi chú: trang/mục cụ thể trong nguồn"
                value={link.source_note}
                maxLength={500}
                onChange={(event) =>
                  setSources(sources.map((item, i) => (i === index ? { ...item, source_note: event.target.value } : item)))
                }
              />
              <Input
                aria-label={`Ghi chú độ tin cậy của nguồn ${nameOf(options.sources, link.source_id)}`}
                placeholder="Độ tin cậy: mức chắc chắn, điểm còn tranh luận…"
                value={link.confidence_note}
                maxLength={500}
                onChange={(event) =>
                  setSources(sources.map((item, i) => (i === index ? { ...item, confidence_note: event.target.value } : item)))
                }
              />
            </li>
          ))}
        </ul>
        <AddPicker
          label="Chọn nguồn"
          options={options.sources}
          usedIds={new Set(sources.map((item) => item.source_id))}
          disabled={disabled}
          onAdd={(id) => setSources([...sources, { source_id: id, source_note: "", confidence_note: "" }])}
        />
        <p className="text-sm text-muted-foreground">
          Chưa có nguồn phù hợp?{" "}
          <a href="/quan-tri/noi-dung/nguon/moi" target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
            Tạo nguồn mới
          </a>{" "}
          (mở tab mới), rồi tải lại trang này để chọn.
        </p>
      </section>
    </div>
  );
}
