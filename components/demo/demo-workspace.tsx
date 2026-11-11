"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FileSearchIcon, AddIcon, ResetIcon, SearchIcon, CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagChip } from "@/components/ui/tag-chip";
import { FileCollection } from "@/components/dashboard/drive-view/file-collection";
import { EmptyState, Toast } from "@/components/dashboard/drive-view/states";
import { getFileTypeLabel } from "@/components/dashboard/file-item/file-type";
import type { FileItemBaseProps } from "@/components/dashboard/file-item/types";
import { FixedLocaleProvider, useI18n } from "@/lib/i18n/i18n-context";
import { cn, formatDate } from "@/lib/utils";
import type { SortState } from "@/lib/ui/sort-files";
import type { DriveFile } from "@/lib/types";
import {
  MAX_DEMO_LABELS,
  MAX_TAG_NAME_LENGTH,
  addTag,
  availableTags,
  createInitialState,
  createTag,
  labelsOf,
  removeTag,
  searchDemo,
  tagCounts,
  toggleFilter,
  type CreateTagError,
} from "@/lib/demo/demo-model";

/**
 * /demo çalışma alanı. Hiçbir ağ isteği, depolama, çerez, kimlik ya da Drive çağrısı yok: bütün durum bu
 * bileşenin belleğindedir ve sayfa yenilenince sıfırlanır (tests/unit/demo.test.ts kaynağı tarar).
 *
 * Satırlar uygulamadaki GERÇEK bileşenlerdir (FileCollection, FileItem, TagChip); arama ve etiket süzgeci
 * uygulamadaki gerçek arama motorudur (lib/demo/demo-model.ts). Ayrıntı paneli bu sayfaya özeldir.
 */

const ERROR_TEXT: Record<CreateTagError, string> = {
  empty: "Type a tag name first.",
  "too-long": `Tag names can be up to ${MAX_TAG_NAME_LENGTH} characters.`,
  // Etiketi dosyadan çıkarmak etiket tanımını silmez (removeTag), yani yer açan tek şey sıfırlamadır.
  limit: `The demo is limited to ${MAX_DEMO_LABELS} tags. Reset the demo to add more.`,
};

const BLOCKED_NOTICE = "This is sample data, so file actions are turned off in the demo.";

const noopSubscribe = () => () => {};

/** Ayrıntı paneli listenin yanında değil altında açılan genişlik (Tailwind `lg` = 1024px'in altı). */
const STACKED_LAYOUT_QUERY = "(max-width: 1023px)";

/**
 * Radix menüleri (⋯ ve sağ tık) kapanınca odağı tetikleyiciye GERİ verir (ölçülen: ~300 ms içinde) ve tarayıcı oraya
 * kaydırır. Menü maddesinden gelen bir seçimden sonra yapılan odak/kaydırma bundan önce çalışırsa geri alınır
 * ("Add label" kutuya odaklanamıyor, telefonda panele kaydırma ilk konuma dönüyordu).
 */
const AFTER_MENU_CLOSE_MS = 450;

/** Menüden geliyorsak menü kapanıp odak dönene kadar bekler (zamanlayıcı kimliğini döndürür); değilse bir sonraki karede çalıştırır. */
function afterMenuClose(fn: () => void): () => void {
  const fromMenu = typeof document !== "undefined" && !!document.activeElement?.closest?.('[role="menu"]');
  if (fromMenu) {
    const id = window.setTimeout(fn, AFTER_MENU_CLOSE_MS);
    return () => window.clearTimeout(id);
  }
  const id = requestAnimationFrame(fn);
  return () => cancelAnimationFrame(id);
}

/** Çalışma alanı görünümü (testte doğrudan işlenir; sunucu/istemci kapısı {@link DemoWorkspace}'tedir). */
export function DemoWorkspaceView() {
  const { t, dateLocale } = useI18n();
  const ids = useId();

  const [state, setState] = useState(createInitialState);
  const [text, setText] = useState("");
  const [filterIds, setFilterIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState<CreateTagError | null>(null);
  const newTagRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLElement>(null);

  const result = useMemo(() => searchDemo(state, { text, filterLabelIds: filterIds }), [state, text, filterIds]);
  const counts = useMemo(() => tagCounts(state), [state]);
  const selected = state.files.find((f) => f.id === selectedId) ?? null;

  const blocked = () => setNotice(BLOCKED_NOTICE);
  const select = (file: DriveFile) => setSelectedId(file.id);
  const reset = () => {
    setState(createInitialState());
    setText("");
    setFilterIds([]);
    setSelectedId(null);
    setSort(null);
    setNewTag("");
    setTagError(null);
    setNotice(null);
  };
  const clearFilters = () => {
    setText("");
    setFilterIds([]);
  };

  const itemProps = (file: DriveFile): Omit<FileItemBaseProps, "file"> => ({
    accessToken: "",
    selected: file.id === selectedId,
    onSelect: select,
    onOpenFolder: blocked,
    onPreview: blocked,
    onCopy: blocked,
    onCut: blocked,
    onDelete: blocked,
    onRename: blocked,
    onDownload: blocked,
    onAddLabel: (f) => {
      select(f);
      // Panel seçimden sonra render olur; odak, menünün odağı geri vermesinden SONRA yeni etiket kutusuna gider.
      afterMenuClose(() => newTagRef.current?.focus());
    },
    onOpenDetails: select,
    labels: labelsOf(state, file.id),
  });

  const submitNewTag = () => {
    if (!selected) return;
    const created = createTag(state, selected.id, newTag);
    if (created.error) {
      setTagError(created.error);
      return;
    }
    setState(created.state);
    setNewTag("");
    setTagError(null);
  };

  const addable = selected ? availableTags(state, selected.id) : [];

  // Dar ekranda ayrıntı paneli 12 satırlık listenin ALTINDA açılır; kaydırılmazsa seçen kişi hiçbir değişiklik görmez.
  // Dokunmatik ekranda satıra dokunmak SEÇMEZ (use-file-item-actions: dokunuş = aç = demoda kapalı bildirim); panele
  // ⋯ menüsünden (Properties / Add label) ya da farenin dar pencerede tıklamasıyla gelinir. İkisi de selectedId'i değiştirir.
  // Yalnız seçim değişince ve yalnız yığılı düzende kaydırır; odağı oynatmaz.
  useEffect(() => {
    if (!selectedId || !window.matchMedia(STACKED_LAYOUT_QUERY).matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return afterMenuClose(() => {
      detailsRef.current?.scrollIntoView?.({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    });
  }, [selectedId]);

  return (
    <section aria-labelledby={`${ids}-title`} className="overflow-hidden rounded-xl border border-line bg-canvas text-fg shadow-sm">
      <header className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2">
        <h2 id={`${ids}-title`} className="text-lg font-semibold">
          Sample files
        </h2>
        <span className="rounded-sm border border-line px-1.5 py-0.5 text-xs font-medium text-fg-2">Demo data · made up</span>
        <p className="ml-auto text-sm text-fg-2 tabular-nums" role="status">
          {result.files.length} of {state.files.length} files
        </p>
        <Button variant="ghost" size="md" className="gap-1.5" onClick={reset}>
          <ResetIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </Button>
      </header>

      <div className="space-y-3 border-b border-line px-4 py-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden="true" />
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search by file or tag name…"
            aria-label="Search the sample files"
            className="pl-8"
          />
        </div>
        <div>
          <p id={`${ids}-tags`} className="mb-1.5 text-xs font-medium text-fg-3">
            Filter by tag. Pick more than one to see only files that have all of them.
          </p>
          <ul aria-labelledby={`${ids}-tags`} className="flex flex-wrap gap-1.5">
            {state.labels.map((label) => {
              const active = filterIds.includes(label.id);
              return (
                <li key={label.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label={`${label.name}, ${counts[label.id] ?? 0} ${counts[label.id] === 1 ? "file" : "files"}`}
                    onClick={() => setFilterIds((prev) => toggleFilter(prev, label.id))}
                    className={cn(
                      "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "[&>span]:border-fg [&>span]:bg-accent-soft" : "hover:[&>span]:bg-hover",
                    )}
                  >
                    <TagChip
                      name={label.name}
                      color={label.color}
                      trailing={<span className="tabular-nums text-fg-3">{counts[label.id] ?? 0}</span>}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          {result.chips.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-fg-2">
              Showing files where:
              {result.chips.map((chip) => (
                <span key={chip.id} className="rounded-sm border border-line px-1.5 py-0.5 font-medium">
                  {chip.text}
                </span>
              ))}
              <button type="button" onClick={clearFilters} className="ml-1 inline-flex items-center gap-1 rounded-sm font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <CloseIcon className="h-3 w-3" aria-hidden="true" />
                Clear
              </button>
            </p>
          )}
          <p className="mt-2 text-xs text-fg-3">
            Tip: select a row to see where the file lives in Drive and to edit its tags. On a phone, tap ⋯ on a row and choose Properties. Type <code className="rounded bg-hover px-1 py-0.5 font-mono">label:Approved</code> in the search box. On a computer, right-click a row for the file menu.
          </p>
        </div>
      </div>

      <div className={cn("grid", selected && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        <div className={cn("min-w-0", selected && "lg:border-r lg:border-line")}>
          <FileCollection
            displayMode="list"
            loading={false}
            groups={[{ key: "demo", files: result.files }]}
            empty={
              <EmptyState
                icon={FileSearchIcon}
                title="No files match"
                body="No sample file has all of these tags and that text. Clear the filters to see everything again."
                action={
                  <Button variant="secondary" size="md" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            }
            itemProps={itemProps}
            sort={sort}
            onSortChange={(next) => setSort(next)}
            selectedCount={selected ? 1 : 0}
            ariaLabel="Sample files"
          />
        </div>

        {selected && (
          <aside ref={detailsRef} aria-label="File details" className="scroll-mt-4 border-t border-line p-4 lg:border-t-0">
            <div className="space-y-4">
                <div>
                  <h3 className="break-words text-base font-semibold">{selected.name}</h3>
                  <p className="text-sm text-fg-2">
                    {getFileTypeLabel(selected, t)} · Modified {formatDate(selected.modifiedTime, dateLocale)}
                  </p>
                  {!result.files.some((f) => f.id === selected.id) && (
                    <p className="mt-1 text-xs text-fg-2">This file is hidden by the current search or tag filters.</p>
                  )}
                </div>

                <div className="rounded-md border border-line p-3">
                  <p className="text-xs font-medium text-fg-3">Where it lives in Drive</p>
                  <p className="mt-0.5 break-words text-sm">{selected.location}</p>
                  <p className="mt-1 text-xs text-fg-2">Adding or removing tags never changes this.</p>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-fg-3">Tags on this file</p>
                  {labelsOf(state, selected.id).length === 0 ? (
                    <p className="text-sm text-fg-2">No tags yet. Add one below.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {labelsOf(state, selected.id).map((label) => (
                        <li key={label.id}>
                          <TagChip
                            name={label.name}
                            color={label.color}
                            trailing={
                              <button
                                type="button"
                                onClick={() => setState((prev) => removeTag(prev, selected.id, label.id))}
                                aria-label={`Remove the tag ${label.name} from ${selected.name}`}
                                className="-mr-1 flex size-4 items-center justify-center rounded-sm text-fg-3 hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <CloseIcon className="h-3 w-3" aria-hidden="true" />
                              </button>
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  {addable.length > 0 && (
                    <div>
                      <label htmlFor={`${ids}-existing`} className="mb-1 block text-xs font-medium text-fg-3">
                        Add an existing tag
                      </label>
                      <select
                        id={`${ids}-existing`}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) setState((prev) => addTag(prev, selected.id, e.target.value));
                        }}
                        className="h-8 w-full rounded-md border border-control bg-raised px-2 text-base"
                      >
                        <option value="">Choose a tag</option>
                        {addable.map((label) => (
                          <option key={label.id} value={label.id}>
                            {label.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitNewTag();
                    }}
                  >
                    <label htmlFor={`${ids}-new`} className="mb-1 block text-xs font-medium text-fg-3">
                      Or make a new tag
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id={`${ids}-new`}
                        ref={newTagRef}
                        value={newTag}
                        onChange={(e) => {
                          setNewTag(e.target.value);
                          if (tagError) setTagError(null);
                        }}
                        placeholder="For example: Contract"
                        aria-invalid={tagError ? true : undefined}
                        aria-describedby={tagError ? `${ids}-new-error` : undefined}
                        maxLength={MAX_TAG_NAME_LENGTH + 10}
                      />
                      <Button type="submit" variant="secondary" size="md" className="gap-1">
                        <AddIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        Add
                      </Button>
                    </div>
                    {tagError && (
                      <p id={`${ids}-new-error`} role="alert" className="mt-1 text-xs text-danger">
                        {ERROR_TEXT[tagError]}
                      </p>
                    )}
                  </form>
                </div>
            </div>
          </aside>
        )}
      </div>

      {notice && (
        <Toast onDismiss={() => setNotice(null)} dismissLabel="Dismiss">
          {notice}
        </Toast>
      )}
    </section>
  );
}

export function DemoWorkspace() {
  // Tarihin DİLİ sabittir (FixedLocaleProvider) ama günü tarayıcının saat dilimine bağlıdır; sunucu ile istemci
  // farklı yazarsa hidrasyon bozulur.
  // Sunucuda ve ilk boyamada yer tutucu, hidrasyondan sonra gerçek liste.
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!ready) {
    return (
      <div className="rounded-xl border border-line bg-canvas p-8 text-center text-fg-2" role="status">
        Loading the sample files…
      </div>
    );
  }
  // Panel bileşenleri arayüz dilini okur; demo İngilizce yayımlanır, ziyaretçinin kayıtlı dili ne olursa olsun
  // satır başlıkları ve menüler de İngilizce kalır (FixedLocaleProvider kayıtlı dili okumaz/yazmaz).
  return (
    <FixedLocaleProvider locale="en">
      <DemoWorkspaceView />
    </FixedLocaleProvider>
  );
}
