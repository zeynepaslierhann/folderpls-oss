"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { isFolder } from "@/lib/google-drive/google-drive";
import { useFileItemActions } from "./use-file-item-actions";
import { getFileTypeLabel } from "./file-type";
import type { FileItemBaseProps } from "./types";

type ItemLabel = { id: string; name: string; color: string };

/** Sabit boş diziler: varsayılan değer her render'da yeni dizi üretip useCallback'leri bozmasın. */
const NO_LABELS: ItemLabel[] = [];
const NO_DRAG_IDS: string[] = [];

/**
 * Yerleşik durum rozetini (varsa) etiket çiplerinin başına ekler.
 * Saf fonksiyon — liste ve ızgara aynı sırayı kullanır.
 */
export function withStatusChip(
  labels: ItemLabel[],
  statusOption: FileItemBaseProps["statusOption"]
): ItemLabel[] {
  return statusOption
    ? [{ id: "__status", name: statusOption.name, color: statusOption.color }, ...labels]
    : labels;
}

/**
 * Liste satırı (`FileItem`) ve ızgara kartı (`FileGridItem`) için ortak
 * davranış + türetilmiş değerler: bırakma hedefi durumu, etkileşim işleyicileri,
 * klasör mü, tür etiketi, çipler ve bağlam menüsü özellikleri. İkisi aynı ~60
 * satırlık bloğu ayrı ayrı yineliyordu.
 */
export function useFileItemModel(props: FileItemBaseProps) {
  const {
    file,
    selectionActive = false,
    labels = NO_LABELS,
    statusOption,
    dragFileIds = NO_DRAG_IDS,
    onMoveToFolder,
    getDisplayedFiles,
  } = props;

  const { t, dateLocale } = useI18n();
  const [dropTarget, setDropTarget] = useState(false);

  const actions = useFileItemActions({
    file,
    onOpenFolder: props.onOpenFolder,
    onPreview: props.onPreview,
    onSelect: props.onSelect,
    selectionActive,
    dragFileIds,
    onMoveToFolder,
    getDisplayedFiles,
    setDropTarget,
  });

  const menuProps = {
    file,
    onDownload: props.onDownload,
    onAddLabel: props.onAddLabel,
    onCopy: props.onCopy,
    onCut: props.onCut,
    onRename: props.onRename,
    onDelete: props.onDelete,
    onOpenDetails: props.onOpenDetails,
  };

  return {
    t,
    /** undefined = tarayıcının dili; sabit dilli sayfada (/demo) o dilin etiketi. */
    dateLocale,
    dropTarget,
    actions,
    folder: isFolder(file),
    typeLabel: getFileTypeLabel(file, t),
    chips: withStatusChip(labels, statusOption),
    menuProps,
    draggable: dragFileIds.length > 0 && !!onMoveToFolder,
  };
}
