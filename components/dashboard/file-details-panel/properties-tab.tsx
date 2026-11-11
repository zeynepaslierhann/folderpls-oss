"use client";

import { CloseIcon, TagIcon, CalendarIcon, TextTypeIcon, NumberIcon, ListIcon, CheckboxIcon, CircleDotIcon, AddIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { MAX_PROPERTY_TEXT_LENGTH } from "@/lib/storage/snapshot";
import { TagChip, TagDot } from "@/components/ui/tag-chip";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { PropertyDefinition } from "@/lib/types";
import type { LabelItem } from "./types";

interface PropertiesTabProps {
  itemLabels: string[];
  userLabels: LabelItem[];
  propertyDefinitions: PropertyDefinition[];
  itemProperties: Record<string, string | number | boolean | string[]>;
  onAddLabel: (labelId: string) => void;
  onRemoveLabel: (labelId: string) => void;
  onPropertyChange: (
    propertyId: string,
    value: string | number | boolean | string[]
  ) => void;
}

/** Radix Select boş değer kabul etmez: "seçilmedi" için iç değer. */
const NONE = "__none";

/**
 * Tarih alanı: değer uygulamanın tek biçimiyle (formatDate → "Oct 15, 2026")
 * gösterilir; seçim için tarayıcının tarih seçicisi kullanılır (görünmez
 * yerel input alanın üstünde). Saklanan değer değişmez: "YYYY-MM-DD".
 */
function DateField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const display = value ? formatDate(`${value}T00:00`) : null;
  return (
    <div className="relative flex h-8 w-full items-center gap-2 rounded-md border border-control bg-raised px-3 text-base focus-within:border-fg focus-within:ring-1 focus-within:ring-fg">
      <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-fg-3" aria-hidden="true" />
      <span className={display ? "text-fg tabular-nums" : "text-fg-3"} aria-hidden="true">
        {display ?? placeholder}
      </span>
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* showPicker desteklenmiyor: yerel davranış */
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

export function PropertiesTab({
  itemLabels,
  userLabels,
  propertyDefinitions,
  itemProperties,
  onAddLabel,
  onRemoveLabel,
  onPropertyChange,
}: PropertiesTabProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Tags Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs font-medium text-fg-3">
            <TagIcon className="w-3 h-3" />
            {t("dashboard.labels")}
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {itemLabels.map((id) => {
            const label = userLabels.find((l) => l.id === id);
            if (!label) return null;
            return (
              <TagChip
                key={id}
                name={label.name}
                color={label.color}
                className="h-6 pr-0 text-sm"
                trailing={
                  <button
                    type="button"
                    className="flex size-6 items-center justify-center rounded-sm text-fg-3 hover:bg-hover hover:text-fg"
                    onClick={() => onRemoveLabel(id)}
                    aria-label={`${t("common.delete")}: ${label.name}`}
                  >
                    <CloseIcon className="h-3 w-3" aria-hidden="true" />
                  </button>
                }
              />
            );
          })}
          <div className="flex flex-wrap gap-1">
            {userLabels
              .filter((l) => !itemLabels.includes(l.id))
              .map((label) => (
                <Button
                  key={label.id}
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 px-2 text-sm font-normal text-fg-2"
                  onClick={() => onAddLabel(label.id)}
                >
                  <AddIcon className="h-3 w-3" aria-hidden="true" />
                  <TagDot color={label.color} />
                  {label.name}
                </Button>
              ))}
          </div>
        </div>
      </div>

      <div className="my-4 h-px bg-line" />

      {/* Custom Properties */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-xs font-medium text-fg-3">
          <ListIcon className="w-3 h-3" />
          {t("dashboard.customProperties")}
        </Label>

        {propertyDefinitions.length === 0 && (
          <p className="text-sm text-fg-3">
            {t("dashboard.noCustomProperties")}
          </p>
        )}

        {propertyDefinitions.map((prop) => (
          <div key={prop.id} className="space-y-2">
            <div className="flex items-center gap-2">
              {prop.type === "text" && (
                <TextTypeIcon className="h-3.5 w-3.5 text-fg-3" aria-hidden="true" />
              )}
              {prop.type === "number" && (
                <NumberIcon className="h-3.5 w-3.5 text-fg-3" aria-hidden="true" />
              )}
              {prop.type === "date" && (
                <CalendarIcon className="h-3.5 w-3.5 text-fg-3" aria-hidden="true" />
              )}
              {prop.type === "select" && (
                <ListIcon className="h-3.5 w-3.5 text-fg-3" aria-hidden="true" />
              )}
              {prop.type === "status" && (
                <CircleDotIcon className="h-3.5 w-3.5 text-fg-3" aria-hidden="true" />
              )}
              {prop.type === "checkbox" && (
                <CheckboxIcon className="h-3.5 w-3.5 text-fg-3" aria-hidden="true" />
              )}
              <span className="text-sm font-medium">{prop.name}</span>
            </div>

            {prop.type === "text" && (
              <Input
                className="h-8"
                value={String(itemProperties[prop.id] ?? "")}
                onChange={(e) => onPropertyChange(prop.id, e.target.value)}
                maxLength={MAX_PROPERTY_TEXT_LENGTH}
                placeholder="..."
              />
            )}
            {prop.type === "number" && (
              <Input
                type="number"
                className="h-8"
                value={String(itemProperties[prop.id] ?? "")}
                onChange={(e) =>
                  onPropertyChange(prop.id, parseFloat(e.target.value))
                }
                placeholder="0"
              />
            )}
            {prop.type === "date" && (
              <DateField
                value={String(itemProperties[prop.id] ?? "")}
                onChange={(v) => onPropertyChange(prop.id, v)}
                placeholder={t("dashboard.select")}
                label={prop.name}
              />
            )}
            {prop.type === "select" && (
              // Paneldeki diğer seçicilerle aynı özel Select (yerel <select> değil).
              <Select
                value={String(itemProperties[prop.id] ?? "") || NONE}
                onValueChange={(v) => onPropertyChange(prop.id, v === NONE ? "" : v)}
              >
                <SelectTrigger aria-label={prop.name}>
                  <SelectValue placeholder={t("dashboard.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("dashboard.select")}</SelectItem>
                  {prop.options?.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {prop.type === "status" && (
              <div className="flex flex-wrap gap-1.5">
                {prop.options?.map((opt) => {
                  const active = itemProperties[prop.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onPropertyChange(prop.id, active ? "" : opt.id)}
                      className="h-7 rounded-md border px-2.5 text-sm font-medium transition-colors duration-[var(--dur-fast)]"
                      style={
                        active
                          ? {
                              backgroundColor: opt.color,
                              color: opt.textColor ?? "hsl(var(--primary-foreground))",
                              borderColor: opt.color,
                            }
                          : {
                              backgroundColor: `color-mix(in srgb, ${opt.color} 12%, transparent)`,
                              borderColor: opt.color,
                              color: opt.color,
                            }
                      }
                    >
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            )}
            {prop.type === "checkbox" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(itemProperties[prop.id])}
                  onChange={(e) => onPropertyChange(prop.id, e.target.checked)}
                  className="h-4 w-4 rounded-sm border-control accent-[var(--fg)]"
                />
                <span className="text-sm text-fg-2">
                  {Boolean(itemProperties[prop.id])
                    ? t("common.yes")
                    : t("common.no")}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
