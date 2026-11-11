"use client";

import { useState, type ReactNode, type CSSProperties } from "react";
import { AddIcon, TagIcon, FileKindIcon, CalendarIcon, FilterIcon, LinkIcon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/i18n-context";
import { chipText, createChipId } from "@/lib/search/query-parser";
import { normalizeTr } from "@/lib/search/normalize";
import { tagDotStyle } from "@/lib/tag-tone";
import type { SearchChip } from "@/lib/search/types";
import type { DriveFile, LabelItem, PropertyDefinition } from "@/lib/types";

interface AddFilterMenuProps {
  userLabels: LabelItem[];
  propertyDefinitions: PropertyDefinition[];
  files: DriveFile[];
  onAdd: (chip: SearchChip) => void;
  /** Özel tetikleyici (üst çubuktaki "Filter"); verilmezse eski "+ Add filter". */
  trigger?: ReactNode;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
const DAY_MS = 24 * 60 * 60 * 1000;

export function AddFilterMenu({ userLabels, propertyDefinitions, files, onAdd, trigger }: AddFilterMenuProps) {
  const { t } = useI18n();
  const chipLabel = (field: string, value: string) => chipText(field, value, t("dashboard.search.chipFormat"));
  const [extensionInput, setExtensionInput] = useState("");
  const [relatedQuery, setRelatedQuery] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const relatedMatches = relatedQuery.trim()
    ? files.filter((f) => normalizeTr(f.name).includes(normalizeTr(relatedQuery.trim()))).slice(0, 6)
    : [];

  const selectableProperties = propertyDefinitions.filter(
    (p) => p.type === "select" || p.type === "status"
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" size="sm" className="gap-1.5">
            <AddIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t("dashboard.search.addFilter")}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Label */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <TagIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("dashboard.search.filterLabel")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
            {userLabels.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-fg-3">{t("dashboard.search.noOptions")}</div>
            )}
            {userLabels.map((label) => (
              <DropdownMenuItem
                key={label.id}
                onClick={() =>
                  onAdd({
                    id: createChipId(),
                    kind: "label",
                    labelId: label.id,
                    displayLabel: chipLabel(t("dashboard.search.filterLabel"), label.name),
                  })
                }
              >
                <span className="tag-dot mr-2 size-2 shrink-0 rounded-full" style={tagDotStyle(label.color) as CSSProperties} />
                <span className="truncate">{label.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Type */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileKindIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("dashboard.search.filterType")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuItem
              onClick={() =>
                onAdd({ id: createChipId(), kind: "type", fileType: "folder", displayLabel: chipLabel(t("dashboard.search.filterType"), t("dashboard.search.typeFolder")) })
              }
            >
              {t("dashboard.search.typeFolder")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onAdd({ id: createChipId(), kind: "type", fileType: "file", displayLabel: chipLabel(t("dashboard.search.filterType"), t("dashboard.search.typeFile")) })
              }
            >
              {t("dashboard.search.typeFile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="flex items-center gap-1 px-2 py-1.5">
              <Input
                value={extensionInput}
                onChange={(e) => setExtensionInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && extensionInput.trim()) {
                    const ext = extensionInput.trim().replace(/^\./, "").toLowerCase();
                    onAdd({ id: createChipId(), kind: "type", fileType: ext, displayLabel: chipLabel(t("dashboard.search.filterType"), `.${ext}`) });
                    setExtensionInput("");
                  }
                }}
                placeholder={t("dashboard.search.typeExtensionPlaceholder")}
                className="h-7 text-sm"
              />
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Date range */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CalendarIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("dashboard.search.filterDate")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60">
            <DropdownMenuItem
              onClick={() =>
                onAdd({
                  id: createChipId(),
                  kind: "dateRange",
                  dateFrom: startOfToday(),
                  dateTo: startOfToday() + DAY_MS,
                  displayLabel: chipLabel(t("dashboard.search.filterDate"), t("dashboard.search.dateToday")),
                })
              }
            >
              {t("dashboard.search.dateToday")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onAdd({
                  id: createChipId(),
                  kind: "dateRange",
                  dateFrom: startOfToday() - 7 * DAY_MS,
                  dateTo: startOfToday() + DAY_MS,
                  displayLabel: chipLabel(t("dashboard.search.filterDate"), t("dashboard.search.dateThisWeek")),
                })
              }
            >
              {t("dashboard.search.dateThisWeek")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onAdd({
                  id: createChipId(),
                  kind: "dateRange",
                  dateFrom: startOfToday() - 30 * DAY_MS,
                  dateTo: startOfToday() + DAY_MS,
                  displayLabel: chipLabel(t("dashboard.search.filterDate"), t("dashboard.search.dateThisMonth")),
                })
              }
            >
              {t("dashboard.search.dateThisMonth")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 space-y-1.5">
              <p className="text-xs font-medium text-fg-3">{t("dashboard.search.dateCustom")}</p>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-7 text-sm"
                aria-label={t("dashboard.search.dateFrom")}
              />
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-7 text-sm"
                aria-label={t("dashboard.search.dateTo")}
              />
              <Button
                size="sm"
                className="h-7 w-full text-sm"
                disabled={!customFrom}
                onClick={() => {
                  const from = Date.parse(customFrom);
                  const to = customTo ? Date.parse(customTo) + DAY_MS : from + DAY_MS;
                  if (Number.isNaN(from)) return;
                  onAdd({
                    id: createChipId(),
                    kind: "dateRange",
                    dateFrom: from,
                    dateTo: to,
                    displayLabel: chipLabel(t("dashboard.search.filterDate"), `${customFrom}${customTo ? ` → ${customTo}` : ""}`),
                  });
                  setCustomFrom("");
                  setCustomTo("");
                }}
              >
                {t("dashboard.search.apply")}
              </Button>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Property */}
        {selectableProperties.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FilterIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
              {t("dashboard.search.filterProperty")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-64 overflow-y-auto w-56">
              {selectableProperties.flatMap((prop) =>
                (prop.options ?? []).map((opt) => (
                  <DropdownMenuItem
                    key={`${prop.id}_${opt.id}`}
                    onClick={() =>
                      onAdd({
                        id: createChipId(),
                        kind: "property",
                        propertyId: prop.id,
                        propertyValue: opt.name,
                        displayLabel: chipLabel(prop.name, opt.name),
                      })
                    }
                  >
                    <span className="tag-dot mr-2 size-2 shrink-0 rounded-full" style={tagDotStyle(opt.color) as CSSProperties} />
                    <span className="truncate">
                      {prop.name}: {opt.name}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Related file */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LinkIcon className="mr-2 h-4 w-4 text-fg-2" aria-hidden="true" />
            {t("dashboard.search.filterRelated")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            <div className="px-2 py-1.5">
              <Input
                value={relatedQuery}
                onChange={(e) => setRelatedQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={t("dashboard.search.relatedFileSearchPlaceholder")}
                className="h-7 text-sm"
              />
            </div>
            {relatedMatches.map((file) => (
              <DropdownMenuItem
                key={file.id}
                onClick={() =>
                  onAdd({
                    id: createChipId(),
                    kind: "relatedFile",
                    relatedFileId: file.id,
                    displayLabel: chipLabel(t("dashboard.search.filterRelated"), file.name),
                  })
                }
              >
                <span className="truncate">{file.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
