"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { addSgkLessonEventAction, removeSgkLessonEventAction } from "@/lib/actions/sgk";
import { initialActionState, type ActionState } from "@/lib/actions/state";
import { contentPaths } from "@/lib/admin/content-kinds";
import type { AdminSgkAssignment, AdminSgkEvent } from "@/lib/queries/admin-sgk";

type Section = { id: string; numeral: string; title: string };

function Message({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-accent" : "text-sm text-success"}>
      {state.message}
    </p>
  );
}

function RemoveButton({ assignment, lessonSlug }: { assignment: AdminSgkAssignment; lessonSlug: string }) {
  const [state, action, pending] = useActionState(removeSgkLessonEventAction, initialActionState);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="assignment_id" value={assignment.id} />
      <input type="hidden" name="lesson_slug" value={lessonSlug} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} aria-label={`Bỏ "${assignment.event.title}" khỏi mục`}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Bỏ
      </Button>
      {state.status === "error" && <Message state={state} />}
    </form>
  );
}

function AddForm({ lessonSlug, section, events }: { lessonSlug: string; section: Section; events: AdminSgkEvent[] }) {
  const [state, action, pending] = useActionState(addSgkLessonEventAction, initialActionState);
  const fieldId = `them-${section.id}`;
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
      <input type="hidden" name="lesson_slug" value={lessonSlug} />
      <input type="hidden" name="section_id" value={section.id} />
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          Gán thêm sự kiện vào mục {section.numeral}
        </label>
        <Select id={fieldId} name="event_id" defaultValue="">
          <option value="" disabled>
            Chọn sự kiện…
          </option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} · {event.dateText}
              {event.status === "published" ? "" : " (chưa công bố)"}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending || events.length === 0}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Gán
      </Button>
      <Message state={state} />
    </form>
  );
}

/**
 * Gán sự kiện vào từng mục của một Bài SGK (GĐ7). Sự kiện chưa công bố vẫn gán được nhưng chỉ hiện ở trang công khai
 * sau khi được duyệt và công bố. `readOnly`: kiểm duyệt viên chỉ xem.
 */
export function SgkAssignmentManager({
  lessonSlug,
  sections,
  assignments,
  events,
  readOnly,
}: {
  lessonSlug: string;
  sections: Section[];
  assignments: AdminSgkAssignment[];
  events: AdminSgkEvent[];
  readOnly?: boolean;
}) {
  return (
    <ol className="flex flex-col gap-6">
      {sections.map((section) => {
        const items = assignments.filter((item) => item.sectionId === section.id);
        const assignedIds = new Set(items.map((item) => item.event.id));
        return (
          <li key={section.id} className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-serif text-lg font-bold text-foreground">
              Mục {section.numeral}. {section.title}
            </h2>
            {items.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Chưa gán sự kiện nào — trang công khai hiện “Nội dung mục này đang biên soạn”.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <Link href={contentPaths.edit("su-kien", item.event.id)} className="font-medium text-foreground hover:text-accent hover:underline">
                        {item.event.title}
                      </Link>
                      <span className="text-sm text-muted-foreground">{item.event.dateText}</span>
                      <StatusBadge status={item.event.status} />
                    </span>
                    {!readOnly && <RemoveButton assignment={item} lessonSlug={lessonSlug} />}
                  </li>
                ))}
              </ul>
            )}
            {!readOnly && (
              <div className="mt-4 border-t border-border pt-4">
                <AddForm lessonSlug={lessonSlug} section={section} events={events.filter((event) => !assignedIds.has(event.id))} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
