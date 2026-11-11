"use client";

import { DocumentIcon, HeadingIcon, CheckboxIcon, DeleteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { NoteBlock } from "@/lib/types";

interface NotesTabProps {
  notes: NoteBlock[];
  onAddBlock: (type: NoteBlock["type"]) => void;
  onUpdateContent: (id: string, content: string) => void;
  onDeleteBlock: (id: string) => void;
  onToggleTodo: (id: string) => void;
  onBlur: () => void;
}

export function NotesTab({
  notes,
  onAddBlock,
  onUpdateContent,
  onDeleteBlock,
  onToggleTodo,
  onBlur,
}: NotesTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Add Block Buttons */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-2"
          onClick={() => onAddBlock("text")}
        >
          <DocumentIcon className="w-4 h-4" /> {t("dashboard.text")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-2"
          onClick={() => onAddBlock("heading")}
        >
          <HeadingIcon className="w-4 h-4" /> {t("dashboard.heading")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-2"
          onClick={() => onAddBlock("todo")}
        >
          <CheckboxIcon className="w-4 h-4" /> {t("dashboard.todo")}
        </Button>
      </div>

      {/* Notes List */}
      <div className="space-y-4 min-h-[200px]">
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <DocumentIcon className="w-8 h-8 mb-2 text-fg-3" />
            <p className="text-sm italic">{t("dashboard.addNoteHint")}</p>
          </div>
        )}

        {notes.map((block) => (
          <div key={block.id} className="group relative flex items-start gap-2">
            {block.type === "todo" && (
              <input
                type="checkbox"
                checked={block.checked}
                onChange={() => onToggleTodo(block.id)}
                className="mt-1.5 h-4 w-4 rounded border-input"
              />
            )}
            <div className="flex-1 min-w-0">
              {block.type === "heading" ? (
                <Input
                  className="font-bold text-lg border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                  value={block.content}
                  onChange={(e) => onUpdateContent(block.id, e.target.value)}
                  onBlur={onBlur}
                  placeholder={t("dashboard.headingPlaceholder")}
                />
              ) : (
                <textarea
                  className={`w-full bg-transparent border-none resize-none focus:ring-0 p-0 text-sm ${
                    block.type === "todo" && block.checked
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                  value={block.content}
                  onChange={(e) => onUpdateContent(block.id, e.target.value)}
                  onBlur={onBlur}
                  placeholder={t("dashboard.typingPlaceholder")}
                  rows={1}
                  style={{ height: "auto" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = target.scrollHeight + "px";
                  }}
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 absolute -right-6"
              onClick={() => onDeleteBlock(block.id)}
            >
              <DeleteIcon className="h-3 w-3 text-danger" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
